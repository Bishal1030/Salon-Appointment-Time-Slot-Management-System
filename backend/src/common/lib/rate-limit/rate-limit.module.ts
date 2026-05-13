import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import rateLimit from 'express-rate-limit';

// Standard API Limiter 
export const standardLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
  message: 'Too many requests, please try again later.',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

// Bulk Notification Limiter 
export const bulkNotificationLimiter = rateLimit({
  windowMs: 4 * 60 * 1000, // 4 minutes
  limit: 2,
  message: 'Bulk limit reached. Please wait 4 minutes.',
  standardHeaders: 'draft-8',
  legacyHeaders: false,
});

@Module({})
export class RateLimitModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(bulkNotificationLimiter)
      .forRoutes({ path: 'notifications/bulk', method: RequestMethod.POST });

    consumer
      .apply(standardLimiter)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
