import { IsEmail, IsNotEmpty, IsString, IsDateString } from 'class-validator';

export class BulkAppointmentRowDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  service: string;

  @IsDateString()
  @IsNotEmpty()
  time: string;
}
