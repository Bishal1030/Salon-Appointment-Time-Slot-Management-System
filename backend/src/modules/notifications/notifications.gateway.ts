import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: 'notifications',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log('Client connected to notifications gateway:', client.id);
  }

  handleDisconnect(client: Socket) {
    console.log('Client disconnected from notifications gateway:', client.id);
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { userId: string }) {
    if (data.userId) {
      console.log(`Client ${client.id} subscribing to user room: ${data.userId}`);
      client.join(data.userId);
    }
  }

  sendNotificationUpdate(userId: string | null, data: any) {
    if (userId) {
      this.server.to(userId).emit('notification_status', data);
    } else {
      this.server.emit('notification_status', data); // Fallback to broadcast
    }
  }

  sendBulkJobUpdate(userId: string | null, data: any) {
    if (userId) {
      this.server.to(userId).emit('bulk_job_status', data);
    } else {
      this.server.emit('bulk_job_status', data); // Fallback to broadcast
    }
  }
}
