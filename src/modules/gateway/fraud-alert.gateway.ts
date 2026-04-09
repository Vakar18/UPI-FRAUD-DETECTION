import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

export interface FraudAlertPayload {
  txnId: string;
  senderId: string;
  receiverId: string;
  amount: number;
  city: string;
  riskScore: number;
  riskLevel: string;
  riskReason: string;
  fraudSignals: Record<string, boolean | number>;
  scoredAt: string;
}

export interface TxnScoredPayload {
  txnId: string;
  riskScore: number;
  riskLevel: string;
  status: string;
  scoredAt: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  namespace: '/fraud',
  transports: ['websocket', 'polling'],
})
export class FraudAlertGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(FraudAlertGateway.name);
  private connectedClients = 0;

  afterInit(): void {
    this.logger.log('WebSocket gateway initialised at /fraud');
  }

  handleConnection(client: Socket): void {
    this.connectedClients++;
    client.join('dashboard');
    this.logger.log(`Client connected: ${client.id} | total: ${this.connectedClients}`);

    client.emit('connected', {
      clientId: client.id,
      serverTime: new Date().toISOString(),
    });
  }

  handleDisconnect(client: Socket): void {
    this.connectedClients = Math.max(this.connectedClients - 1, 0);
    this.logger.log(`Client disconnected: ${client.id} | total: ${this.connectedClients}`);
  }

  @SubscribeMessage('subscribe-alerts-only')
  handleSubscribeAlertsOnly(@ConnectedSocket() client: Socket) {
    client.join('alerts-only');
    this.logger.debug(`${client.id} subscribed to alerts-only`);
    return { event: 'subscribed', data: 'alerts-only' };
  }

  @SubscribeMessage('unsubscribe-alerts-only')
  handleUnsubscribeAlertsOnly(@ConnectedSocket() client: Socket) {
    client.leave('alerts-only');
    return { event: 'unsubscribed', data: 'alerts-only' };
  }

  publishAlert(payload: FraudAlertPayload): void {
    this.logger.warn(
      `FRAUD ALERT - ${payload.txnId} | ${payload.riskLevel} (${payload.riskScore}) | ${payload.city}`,
    );
    this.server.to('dashboard').emit('fraud-alert', payload);
    this.server.to('alerts-only').emit('fraud-alert', payload);
  }

  publishScored(payload: TxnScoredPayload): void {
    this.server.to('dashboard').emit('txn-scored', payload);
  }

  publishStatsUpdate(stats: Record<string, unknown>): void {
    this.server.to('dashboard').emit('stats-update', stats);
  }

  getConnectedCount(): number {
    return this.connectedClients;
  }
}
