import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AppointmentsService } from './appointments.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@ApiTags('appointments')
@Controller('appointments')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Post()
  @ApiOperation({ summary: 'Book a new salon appointment' })
  @ApiResponse({ status: 201, description: 'Appointment booked successfully' })
  create(@Req() req: any, @Body() dto: CreateAppointmentDto) {
    return this.appointmentsService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all appointments (Admin sees all, User sees own)' })
  findAll(@Req() req: any) {
    return this.appointmentsService.findAll(req.user.userId, req.user.role);
  }

  @Get('available-slots')
  @ApiOperation({ summary: 'Get available time slots for a specific date and service' })
  @ApiQuery({ name: 'date', description: 'Date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'serviceId', description: 'ID of the service' })
  getAvailableSlots(@Query('date') date: string, @Query('serviceId') serviceId: string) {
    return this.appointmentsService.getAvailableSlots(date, serviceId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific appointment by ID' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.appointmentsService.findOne(id, req.user.userId, req.user.role);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update appointment details' })
  update(@Req() req: any, @Param('id') id: string, @Body() dto: UpdateAppointmentDto) {
    return this.appointmentsService.update(id, req.user.userId, req.user.role, dto);
  }
}
