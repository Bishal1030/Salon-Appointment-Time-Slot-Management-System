import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {
    console.log('Client connected to notifications gateway:', client.id);
  }

  handleDisconnect(client: any) {
    console.log('Client disconnected from notifications gateway:', client.id);
  }

  sendNotificationUpdate(data: any) {
    this.server.emit('notification_status', data);
  }

  sendBulkJobUpdate(data: any) {
    this.server.emit('bulk_job_status', data);
  }
}
