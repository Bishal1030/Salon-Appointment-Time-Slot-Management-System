import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { ClientProxy } from '@nestjs/microservices';
import { JobStatus, NotificationStatus } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
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

  async uploadToCloudinary(fileBuffer: Buffer, originalName: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: 'raw',
          public_id: `bulk-notifications/${Date.now()}-${originalName}`,
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

    // Create all items in bulk
    await this.prisma.bulkJobItem.createMany({
      data: items.map((item) => ({
        jobId: job.id,
        email: item.email,
        service: item.service,
        time: new Date(item.time),
        status: NotificationStatus.PENDING,
      })),
    });

    // Emit event to RabbitMQ for background processing
    this.rmqClient.emit('bulk_notify', { jobId: job.id });

    return job;
  }

  async processBulkJob(jobId: string) {
    const job = await this.prisma.bulkJob.findUnique({
      where: { id: jobId },
      include: { items: true, template: true },
    });

    if (!job || !job.template) {
      console.error(`Job ${jobId} or its template not found`);
      return;
    }

    await this.prisma.bulkJob.update({
      where: { id: jobId },
      data: { status: JobStatus.PROCESSING },
    });

    for (const item of job.items) {
      try {
        const appointmentDate = new Date(item.time);
        
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
    await this.prisma.bulkJobItem.update({
      where: { id },
      data: { status, error },
    });
  }

  private async incrementJobCounter(jobId: string, counter: 'processed' | 'success' | 'failed') {
    await this.prisma.bulkJob.update({
      where: { id: jobId },
      data: { [counter]: { increment: 1 } },
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
}
