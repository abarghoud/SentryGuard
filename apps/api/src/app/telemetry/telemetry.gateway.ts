import { Inject, Logger } from '@nestjs/common';
import { WebSocketGateway, OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect, MessageBody, ConnectedSocket, SubscribeMessage, WebSocketServer } from '@nestjs/websockets';
import { TelemetryService } from './telemetry.service';

@WebSocketGateway({ path: '/' })
export class TelemetryGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(TelemetryGateway.name);

  @WebSocketServer()
  private server: any;

  constructor(@Inject(TelemetryService) private readonly telemetryService: TelemetryService) {}

  afterInit() {
    this.logger.log('✅ WebSocket TelemetryGateway initialisé (path: /)');
  }

  handleConnection(client: any) {
    this.logger.log('🔌 Client WebSocket connecté');
    // Support des messages bruts (wscat, clients non enveloppés {event, data})
    if (client && typeof client.on === 'function') {
      client.on('message', async (raw: any) => {
        try {
          const data = this.parseIncomingPayload(raw);
          this.logger.log(`📨 WS raw message reçu`, data);
          //await this.telemetryService.processTelemetryMessage(data);
        } catch (err) {
          this.logger.error('❌ Erreur lors du traitement du message WS brut', err as Error);
        }
      });
    }
  }

  handleDisconnect(client: any) {
    this.logger.log('🔌 Client WebSocket déconnecté');
  }

  @SubscribeMessage('/')
  async onMessage(@MessageBody() payload: any, @ConnectedSocket() client: any) {
    console.log('onMessage', payload);
    try {
      // Les messages peuvent arriver en Buffer/string → parser en JSON si possible
      const data = this.parseIncomingPayload(payload);
      await this.telemetryService.processTelemetryMessage(data);
    } catch (err) {
      this.logger.error('❌ Erreur lors du traitement du message WS', err as Error);
    }
  }

  private parseIncomingPayload(payload: any): any {
    if (!payload) return {};
    if (typeof payload === 'string') {
      try {
        return JSON.parse(payload);
      } catch {
        return { raw: payload };
      }
    }
    if (Buffer.isBuffer(payload)) {
      const text = payload.toString('utf8');
      try {
        return JSON.parse(text);
      } catch {
        return { raw: text };
      }
    }
    return payload;
  }
}


