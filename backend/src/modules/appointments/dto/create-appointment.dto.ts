import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateAppointmentDto {
  @ApiProperty({ description: 'ID of the service being booked' })
  @IsString()
  @IsNotEmpty()
  serviceId: string;

  @ApiProperty({ description: 'Appointment start time (ISO 8601 string)' })
  @IsDateString()
  @IsNotEmpty()
  startTime: string;
}
