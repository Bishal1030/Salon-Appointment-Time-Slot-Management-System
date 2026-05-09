import { Controller, Get, Param, Post, UseGuards, UseInterceptors, UploadedFile, BadRequestException, Body, Patch, Req, UnauthorizedException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { NotificationsService } from '../notifications.service';
import { JwtGuard } from '../../auth/guards/jwt.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import * as xlsx from 'xlsx';
import { BulkAppointmentRowDto } from '../dto/bulk-appointment.dto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) { }

  @Get('templates')
  @ApiOperation({ summary: 'List all available notification templates' })
  @ApiResponse({ status: 200, description: 'Returns all active templates' })
  findAllTemplates() {
    return this.notificationsService.findAllTemplates();
  }

  @Get('templates/:id')
  @ApiOperation({ summary: 'Get a specific notification template by ID' })
  @ApiResponse({ status: 200, description: 'Returns the template' })
  @ApiResponse({ status: 404, description: 'Template not found' })
  findOneTemplate(@Param('id') id: string) {
    return this.notificationsService.findOneTemplate(id);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Upload Excel file for bulk appointment notifications' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadBulk(
    @Body('templateId') templateId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }
    if (!templateId) {
      throw new BadRequestException('templateId is required');
    }

    // Upload to Cloudinary
    let fileUrl: string;
    try {
      fileUrl = await this.notificationsService.uploadToCloudinary(file.buffer, file.originalname);
    } catch (error) {
      throw new BadRequestException(`Cloudinary upload failed: ${error.message}`);
    }

    // Parse Excel
    const workbook = xlsx.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(sheet);

    const validatedItems: BulkAppointmentRowDto[] = [];

    for (const row of rows) {
      const item = plainToInstance(BulkAppointmentRowDto, row);
      const errors = await validate(item);
      if (errors.length > 0) {
        throw new BadRequestException(`Validation failed for row: ${JSON.stringify(row)}`);
      }
      validatedItems.push(item);
    }

    // Create Bulk Job
    return this.notificationsService.createBulkJob(file.originalname, fileUrl, validatedItems, templateId);
  }

  @Get('bulk/:jobId')
  @ApiOperation({ summary: 'Check status of a bulk notification job' })
  @ApiResponse({ status: 200, description: 'Returns the job status and items' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  getBulkJobStatus(@Param('jobId') jobId: string) {
    return this.notificationsService.getBulkJobStatus(jobId);
  }

  @Patch('templates/:id/select')
  @ApiOperation({ summary: 'Select a template for the current user' })
  @ApiResponse({ status: 200, description: 'Template selected successfully' })
  selectTemplate(@Req() req: any, @Param('id') id: string) {
    
    if (!req.user || !req.user.userId) {
      throw new UnauthorizedException('User identity not found in token');
    }
    
    return this.notificationsService.selectTemplateForUser(req.user.userId, id);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get all notification logs' })
  findAllLogs() {
    return this.notificationsService.findAllLogs();
  }
}
