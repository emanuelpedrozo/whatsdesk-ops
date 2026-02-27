import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/realtime' })
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  handleConnection(client: Socket) {
    client.emit('connected', { ts: new Date().toISOString() });
  }

  handleDisconnect() {
    // no-op for now
  }

  emitConversationUpdated(payload: unknown) {
    this.server.emit('conversation.updated', payload);
  }

  emitMessageCreated(payload: unknown) {
    this.server.emit('message.created', payload);
  }

  emitDealMoved(payload: unknown) {
    this.server.emit('deal.moved', payload);
  }

  emitOrderCreated(payload: unknown) {
    this.server.emit('order.created', payload);
  }

  @SubscribeMessage('ping')
  ping() {
    return { event: 'pong', data: { ts: new Date().toISOString() } };
  }
}
