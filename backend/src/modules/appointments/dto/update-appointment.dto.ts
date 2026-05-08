import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { AppointmentStatus } from '@prisma/client';

export class UpdateAppointmentDto {
  @ApiProperty({ description: 'New service ID', required: false })
  @IsString()
  @IsOptional()
  serviceId?: string;

  @ApiProperty({ description: 'New start time (ISO 8601)', required: false })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({
    description: 'New appointment status',
    enum: AppointmentStatus,
    required: false,
  })
  @IsEnum(AppointmentStatus)
  @IsOptional()
  status?: AppointmentStatus;
}
