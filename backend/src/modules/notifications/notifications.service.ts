import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ClientProxy } from '@nestjs/microservices';
import { JobStatus, NotificationStatus, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

import { NotificationsGateway } from './notifications.gateway';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
    private gateway: NotificationsGateway,
    @Inject('RMQ_SERVICE') private readonly rmqClient: ClientProxy,
  ) {
    cloudinary.config({
      cloud_name: this.configService.get('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get('CLOUDINARY_API_SECRET'),
    });
  }

  async findAllTemplates() {
    return this.prisma.notificationTemplate.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOneTemplate(id: string) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { id },
    });
    if (!template || !template.isActive) {
      throw new NotFoundException(`Template with ID ${id} not found`);
    }
    return template;
  }

  async selectTemplateForUser(userId: string, templateId: string) {
    // Verify template exists
    await this.findOneTemplate(templateId);

    return this.prisma.user.update({
      where: { id: userId },
      data: { selectedTemplateId: templateId },
      select: { id: true, name: true, email: true, selectedTemplateId: true },
    });
  }

  async uploadToCloudinary(fileBuffer: Buffer, originalName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          folder: 'bulk-appointment',
          public_id: `${Date.now()}-${originalName}`,
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload result is undefined'));
          resolve(result.secure_url);
        },
      );
      uploadStream.end(fileBuffer);
    });
  }

  async createBulkJob(fileName: string, fileUrl: string, items: { email: string; service: string; time: string }[], templateId: string) {
    // Create the main job record first
    const job = await this.prisma.bulkJob.create({
      data: {
        fileName: fileName,
        totalRows: items.length,
        status: JobStatus.PENDING,
        templateId,
      },
    });

    // Create all items in bulk with safety fallbacks
    await this.prisma.bulkJobItem.createMany({
      data: items.map((item) => {
        const date = new Date(item.time);
        const isValidDate = !isNaN(date.getTime());
        
        return {
          jobId: job.id,
          email: item.email || 'missing-email',
          service: item.service || 'unknown-service',
          time: isValidDate ? date : new Date(0), // Fallback to epoch if invalid
          status: NotificationStatus.PENDING,
        };
      }),
    });

    // Emit event to RabbitMQ for background processing
    this.rmqClient.emit('bulk_notifications', { jobId: job.id });

    return job;
  }

  async processBulkJob(jobId: string) {
    const job = await this.prisma.bulkJob.findUnique({
      where: { id: jobId },
      include: { items: true, template: true },
    });

    if (!job || !job.template) {
      throw new Error(`Job ${jobId} or its template not found`);
      return;
    }

    await this.prisma.bulkJob.update({
      where: { id: jobId },
      data: { status: JobStatus.PROCESSING },
    });

    for (const item of job.items) {
      try {
        // Validation check for messy data
        if (!item.email || !item.service || !item.time) {
          throw new Error('Missing required fields (email, service, or time)');
        }

        const appointmentDate = new Date(item.time);
        if (isNaN(appointmentDate.getTime())) {
          throw new Error('Invalid date format');
        }

        // Dynamic placeholder replacement
        let renderedBody = job.template.body
          .replace(/{{customerName}}/g, item.email.split('@')[0]) // Fallback if name not in row
          .replace(/{{serviceName}}/g, item.service)
          .replace(/{{date}}/g, appointmentDate.toLocaleDateString())
          .replace(/{{startTime}}/g, appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        let renderedSubject = job.template.subject
          .replace(/{{serviceName}}/g, item.service);

        // Send the actual rendered template email
        await this.mailService.sendMail(item.email, renderedSubject, renderedBody.replace(/\n/g, '<br>'));

        await this.updateItemStatus(item.id, NotificationStatus.SENT);
        await this.incrementJobCounter(jobId, 'success');
      } catch (error) {
        await this.updateItemStatus(item.id, NotificationStatus.FAILED, error.message);
        await this.incrementJobCounter(jobId, 'failed');
      } finally {
        await this.incrementJobCounter(jobId, 'processed');
      }
    }

    await this.prisma.bulkJob.update({
      where: { id: jobId },
      data: { status: JobStatus.COMPLETED },
    });
  }

  private async updateItemStatus(id: string, status: NotificationStatus, error?: string) {
    const item = await this.prisma.bulkJobItem.update({
      where: { id },
      data: { status, error },
    });
    this.gateway.sendNotificationUpdate(null, { 
      type: 'BULK_ITEM', 
      itemId: id, 
      status, 
      error,
      email: item.email,
      jobId: item.jobId 
    });
  }

  private async incrementJobCounter(jobId: string, counter: 'processed' | 'success' | 'failed') {
    const job = await this.prisma.bulkJob.update({
      where: { id: jobId },
      data: { [counter]: { increment: 1 } },
    });
    this.gateway.sendBulkJobUpdate(null, { 
      jobId, 
      processed: job.processed,
      successful: job.success,
      failed: job.failed,
      total: job.totalRows,
      status: job.status 
    });
  }

  async getBulkJobStatus(jobId: string) {
    const job = await this.prisma.bulkJob.findUnique({
      where: { id: jobId },
      include: { items: true },
    });

    if (!job) {
      throw new NotFoundException(`Bulk Job with ID ${jobId} not found`);
    }

    return job;
  }

  async sendAppointmentConfirmation(appointmentId: string, templateId?: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: { service: true, user: true },
    });

    if (!appointment) return;

    // Create PENDING log immediately
    const log = await this.prisma.notificationLog.create({
      data: {
        appointmentId: appointment.id,
        email: appointment.user.email,
        status: NotificationStatus.PENDING,
      },
    });

    // 2. Emit PENDING status to frontend
    this.gateway.sendNotificationUpdate(appointment.userId, {
      type: 'SINGLE_APPOINTMENT',
      appointmentId: appointment.id,
      status: NotificationStatus.PENDING,
      logId: log.id,
      email: appointment.user.email,
      serviceName: appointment.service.name,
      createdAt: log.createdAt
    });

    try {
      let template;
      if (templateId && templateId.trim()) {
        template = await this.prisma.notificationTemplate.findUnique({ where: { id: templateId } });
      }

      if (!template) {
        template = await this.prisma.notificationTemplate.findFirst({ where: { isActive: true } });
      }

      if (!template) {
        throw new Error('No active notification template found');
      }

      const appointmentDate = new Date(appointment.startTime);

      const renderedBody = template.body
        .replace(/{{customerName}}/g, appointment.user.name)
        .replace(/{{serviceName}}/g, appointment.service.name)
        .replace(/{{date}}/g, appointmentDate.toLocaleDateString())
        .replace(/{{startTime}}/g, appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
        .replace(/{{endTime}}/g, new Date(appointment.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

      const renderedSubject = template.subject
        .replace(/{{serviceName}}/g, appointment.service.name);

      await this.mailService.sendMail(appointment.user.email, renderedSubject, renderedBody.replace(/\n/g, '<br>'));

      //  Update to SENT and emit
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: NotificationStatus.SENT },
      });

      this.gateway.sendNotificationUpdate(appointment.userId, {
        type: 'SINGLE_APPOINTMENT',
        appointmentId: appointment.id,
        status: NotificationStatus.SENT,
        logId: log.id
      });

    } catch (error) {
      // Update to FAILED and emit
      await this.prisma.notificationLog.update({
        where: { id: log.id },
        data: { status: NotificationStatus.FAILED, errorMessage: error.message },
      });

      this.gateway.sendNotificationUpdate(appointment.userId, {
        type: 'SINGLE_APPOINTMENT',
        appointmentId: appointment.id,
        status: NotificationStatus.FAILED,
        logId: log.id,
        error: error.message
      });
    }
  }

  async findAllLogs(userId: string, role: string) {
    const where: any = {};

    if (role !== Role.ADMIN) {
      where.appointment = {
        userId: userId
      };
    }

    return this.prisma.notificationLog.findMany({
      where,
      include: {
        appointment: {
          include: {
            service: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
