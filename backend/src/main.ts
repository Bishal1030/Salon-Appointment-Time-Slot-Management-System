import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Transport, MicroserviceOptions } from '@nestjs/microservices';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(new ValidationPipe());
  app.enableCors();
  app.setGlobalPrefix('api');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.RMQ,
    options: {
      urls: [
        `amqp://${configService.get('RABBITMQ_USER')}:${configService.get('RABBITMQ_PASS')}@${configService.get('RABBITMQ_HOST') || 'localhost'}:5672`,
      ],
      queue: 'bulk_notifications',
      queueOptions: {
        durable: true,
      },
      // Bind queue to default exchange with routing key matching queue name
      prefetchCount: 1, // Process one message at a time
      noAck: false, // Acknowledge messages after processing
      isGlobal: false,
    },
  });

  const config = new DocumentBuilder()
    .setTitle('Salon Appointment Management API')
    .setDescription(
      'API documentation for the Salon Appointment & Time Slot Management System',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  await app.startAllMicroservices();
  await app.listen(configService.get('PORT') ?? 3001);
}
bootstrap();
