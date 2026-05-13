import { Controller } from '@nestjs/common';
import { EventPattern, Payload, Ctx, RmqContext } from '@nestjs/microservices';
import { NotificationsService } from '../notifications.service';

@Controller()
export class NotificationsRmqController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @EventPattern('bulk_notifications')
  async handleBulkNotify(@Payload() data: { jobId: string }, @Ctx() context: RmqContext) {
    const channel = context.getChannelRef();
    const originalMsg = context.getMessage();

    try {
      await this.notificationsService.processBulkJob(data.jobId);
      
      // Manually acknowledge the message
      channel.ack(originalMsg);
    } catch (error) {
      // Negatively acknowledge the message and don't requeue if it failed (prevent infinite loops)
      channel.nack(originalMsg, false, false);
    }
  }
}

