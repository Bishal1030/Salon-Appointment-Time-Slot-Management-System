import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { JwtGuard } from '../auth/guards/jwt.guard';

@ApiTags('notifications')
@Controller('notifications')
@UseGuards(JwtGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

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
}
