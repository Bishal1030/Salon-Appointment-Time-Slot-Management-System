import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './controllers/notifications.controller';
import { NotificationsRmqController } from './controllers/notifications.rmq-controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { RmqModule } from '../../common/rmq/rmq.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    PrismaModule,
    RmqModule.register('bulk_notifications'),
    MailModule,
  ],
  controllers: [NotificationsController, NotificationsRmqController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
