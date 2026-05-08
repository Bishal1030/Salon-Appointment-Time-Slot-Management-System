import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ description: 'Name of the service (e.g., Haircut)' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: 'Description of the service', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Duration in minutes' })
  @IsNumber()
  @Min(1)
  durationMin: number;

  @ApiProperty({ description: 'Price of the service', required: false })
  @IsNumber()
  @IsOptional()
  price?: number;
}
