import { DynamicModule, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ClientsModule, Transport } from '@nestjs/microservices';

@Module({})
export class RmqModule {
  static register(queueName: string): DynamicModule {
    return {
      module: RmqModule,
      imports: [
        ClientsModule.registerAsync([
          {
            name: 'RMQ_SERVICE', // Standard name to inject in your services
            useFactory: (configService: ConfigService) => ({
              transport: Transport.RMQ,
              options: {
                urls: [
                  `amqp://${configService.get<string>('RABBITMQ_USER')}:${configService.get<string>('RABBITMQ_PASS')}@${configService.get<string>('RABBITMQ_HOST') || 'localhost'}:5672`,
                ],
                queue: queueName,
                queueOptions: {
                  durable: true, // Persists messages if RabbitMQ restarts
                },
              },
            }),
            inject: [ConfigService],
          },
        ]),
      ],
      exports: [ClientsModule],
    };
  }
}
