import { Controller } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { NotificationsService } from '../notifications.service';

@Controller()
export class NotificationsRmqController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('bulk_notify')
  async handleBulkNotify(@Payload() data: { jobId: string }) {
    console.log(`Processing bulk notification for Job ID: ${data.jobId}`);
    await this.notificationsService.processBulkJob(data.jobId);
  }
}
