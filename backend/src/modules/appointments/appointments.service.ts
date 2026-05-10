import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { Role } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AppointmentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) { }

  async create(userId: string, dto: CreateAppointmentDto) {
    console.log('--- APPOINTMENT CREATION DEBUG ---');
    console.log('Received Template ID:', dto.templateId);

    const service = await this.prisma.service.findUnique({
      where: { id: dto.serviceId },
    });

    if (!service) {
      throw new NotFoundException(`Service with ID ${dto.serviceId} not found`);
    }

    const start = new Date(dto.startTime);
    if (isNaN(start.getTime())) {
      throw new BadRequestException('Invalid start time format');
    }

    const end = new Date(start.getTime() + service.durationMin * 60000);

    const appointment = await this.prisma.appointment.create({
      data: {
        userId,
        serviceId: dto.serviceId,
        startTime: start,
        endTime: end,
        status: 'CONFIRMED',
      },
      include: {
        service: true,
      },
    });

    // 1. Priority: templateId from request
    // 2. Fallback: user's stored selectedTemplateId
    let finalTemplateId = dto.templateId;

    if (!finalTemplateId) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      finalTemplateId = user?.selectedTemplateId;
    }

    // Trigger notification in background (don't await)
    this.notificationsService.sendAppointmentConfirmation(appointment.id, finalTemplateId);

    return this.prisma.appointment.findUnique({
      where: { id: appointment.id },
      include: {
        service: true,
        notificationLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      }
    });
  }

  async findAll(userId: string, role: string) {
    if (role === Role.ADMIN) {
      return this.prisma.appointment.findMany({
        include: {
          service: true,
          user: { select: { name: true, email: true } },
          notificationLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
        },
        orderBy: { startTime: 'asc' },
      });
    }
    return this.prisma.appointment.findMany({
      where: { userId },
      include: {
        service: true,
        notificationLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string, userId: string, role: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
      include: {
        service: true,
        user: { select: { name: true, email: true } },
        notificationLogs: { orderBy: { createdAt: 'desc' }, take: 1 }
      },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (role !== Role.ADMIN && appointment.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return appointment;
  }

  async update(id: string, userId: string, role: string, dto: UpdateAppointmentDto) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (role !== Role.ADMIN && appointment.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    const updateData: any = { ...dto };

    if (dto.startTime || dto.serviceId) {
      const serviceId = dto.serviceId || appointment.serviceId;
      const service = await this.prisma.service.findUnique({ where: { id: serviceId } });

      if (!service) throw new NotFoundException('Service not found');

      const start = new Date(dto.startTime || appointment.startTime);
      const end = new Date(start.getTime() + service.durationMin * 60000);

      updateData.startTime = start;
      updateData.endTime = end;
    }

    return this.prisma.appointment.update({
      where: { id },
      data: updateData,
      include: { service: true },
    });
  }

  async getAvailableSlots(dateStr: string, serviceId: string) {
    const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
    if (!service) throw new NotFoundException('Service not found');

    const date = new Date(dateStr);
    const dayOfWeek = date.getUTCDay();

    // 1. Get working hours for the day
    const workingHours = await this.prisma.workingHour.findFirst({
      where: { dayOfWeek, isActive: true },
    });

    if (!workingHours) return [];

    // 2. Get existing appointments and breaks for the day
    const now = new Date();
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        startTime: { gte: startOfDay, lte: endOfDay },
        status: { not: 'CANCELLED' },
      },
    });

    const breaks = await this.prisma.breakTime.findMany({
      where: { isActive: true },
    });

    // 3. Generate slots
    const slots: { start: string; end: string }[] = [];
    let current = new Date(date);
    current.setUTCHours(workingHours.startTime.getUTCHours(), workingHours.startTime.getUTCMinutes(), 0, 0);

    const dayEnd = new Date(date);
    dayEnd.setUTCHours(workingHours.endTime.getUTCHours(), workingHours.endTime.getUTCMinutes(), 0, 0);

    const slotDuration = 30; // 30 min intervals for slot starts

    while (current.getTime() + service.durationMin * 60000 <= dayEnd.getTime()) {
      const slotStart = new Date(current);
      const slotEnd = new Date(current.getTime() + service.durationMin * 60000);

      // Skip slots that are in the past
      if (slotStart < now) {
        current = new Date(current.getTime() + slotDuration * 60000);
        continue;
      }

      // Check overlap with appointments
      const isBooked = appointments.some(app =>
        (slotStart < app.endTime && slotEnd > app.startTime)
      );

      // Check overlap with breaks
      const isOnBreak = breaks.some(brk => {
        const bStart = new Date(date);
        bStart.setUTCHours(brk.startTime.getUTCHours(), brk.startTime.getUTCMinutes(), 0, 0);
        const bEnd = new Date(date);
        bEnd.setUTCHours(brk.endTime.getUTCHours(), brk.endTime.getUTCMinutes(), 0, 0);
        return (slotStart < bEnd && slotEnd > bStart);
      });

      if (!isBooked && !isOnBreak) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }

      current = new Date(current.getTime() + slotDuration * 60000);
    }

    return slots;
  }

  async remove(id: string, userId: string, role: string) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${id} not found`);
    }

    if (role !== Role.ADMIN && appointment.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.appointment.delete({
      where: { id },
    });
  }
}
