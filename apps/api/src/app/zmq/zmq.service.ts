import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from '../telegram/telegram.service';
import { Vehicle } from '../../entities/vehicle.entity';
import * as zmq from 'zeromq';

export interface TelemetryMessage {
  data: Array<{
    key: string;
    value: {
      stringValue?: string;
      displayStateValue?: string;
    };
  }>;
  createdAt: string;
  vin: string;
  isResend: boolean;
}

@Injectable()
export class ZmqService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ZmqService.name);
  private socket: zmq.Subscriber;
  private readonly zmqEndpoint = process.env.ZMQ_ENDPOINT || '';

  constructor(
    private readonly telegramService: TelegramService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
  ) {
    this.socket = new zmq.Subscriber();
  }

  async onModuleInit() {
    await this.startListening();
  }

  async onModuleDestroy() {
    await this.stopListening();
  }

  private async startListening() {
    try {
      this.logger.log(`🔌 Connexion au serveur ZMQ: ${this.zmqEndpoint}`);

      await this.socket.connect(this.zmqEndpoint);
      this.socket.subscribe(''); // S'abonner à tous les messages

      this.logger.log('✅ Connexion ZMQ établie avec succès');

      // Écouter les messages
      this.listenForMessages();

    } catch (error) {
      this.logger.error('❌ Erreur lors de la connexion ZMQ:', error);
    }
  }

  private async stopListening() {
    try {
      if (this.socket) {
        this.socket.close();
        this.logger.log('🔌 Connexion ZMQ fermée');
      }
    } catch (error) {
      this.logger.error('❌ Erreur lors de la fermeture ZMQ:', error);
    }
  }

  /**
   * Récupère l'ID utilisateur à partir du VIN du véhicule
   */
  private async getUserIdFromVin(vin: string): Promise<string | null> {
    try {
      const vehicle = await this.vehicleRepository.findOne({
        where: { vin },
        select: ['userId']
      });

      if (vehicle) {
        this.logger.log(`👤 Utilisateur trouvé pour le VIN ${vin}: ${vehicle.userId}`);
        return vehicle.userId;
      } else {
        this.logger.warn(`⚠️ Aucun véhicule trouvé pour le VIN: ${vin}`);
        return null;
      }
    } catch (error) {
      this.logger.error(`❌ Erreur lors de la récupération de l'utilisateur pour le VIN ${vin}:`, error);
      return null;
    }
  }

  private async listenForMessages() {
    for await (const message of this.socket) {
      try {
        // ZMQ peut envoyer plusieurs frames, on les concatène tous
        const messageParts = Array.isArray(message) ? message : [message];
        const fullMessage = messageParts.map(part => part.toString()).join('');

        this.logger.log(`📨 Message ZMQ complet reçu: ${fullMessage}`);

        // Chercher le JSON dans le message complet
        const jsonStart = fullMessage.indexOf('{');
        if (jsonStart === -1) {
          this.logger.warn('⚠️ Message ZMQ sans JSON valide');
          continue;
        }

        const jsonStr = fullMessage.substring(jsonStart);

        try {
          const telemetryData: TelemetryMessage = JSON.parse(jsonStr);

          if (process.env.DEBUG_MESSAGES === 'true') {
            // Récupérer l'userId pour les messages de debug
            const userId = await this.getUserIdFromVin(telemetryData.vin);
            if (userId) {
              await this.telegramService.sendTelegramMessage(userId, jsonStr);
            } else {
              this.logger.warn(`⚠️ Impossible d'envoyer le message de debug - utilisateur non trouvé pour le VIN: ${telemetryData.vin}`);
            }
          }

          await this.processTelemetryMessage(telemetryData);

        } catch (parseError) {
          this.logger.error('❌ Erreur de parsing JSON:', parseError);
          this.logger.log(`Message reçu: ${jsonStr}`);
        }

      } catch (error) {
        this.logger.error('❌ Erreur lors du traitement du message ZMQ:', error);
      }
    }
  }

  private async processTelemetryMessage(message: TelemetryMessage) {
    try {
      this.logger.log(`🚗 Traitement des données télémétrie pour VIN: ${message.vin}`);

      // Récupérer l'userId à partir du VIN
      const userId = await this.getUserIdFromVin(message.vin);
      
      if (!userId) {
        this.logger.warn(`⚠️ Impossible de trouver l'utilisateur pour le VIN: ${message.vin}`);
        return;
      }

      // Vérifier si c'est une alerte Sentry
      const sentryData = message.data.find(item => item.key === 'SentryMode');
      const centerDisplayData = message.data.find(item => item.key === 'CenterDisplay');

      if (sentryData && sentryData.value.stringValue === 'Aware') {
        this.logger.log('🚨 Alerte Sentry détectée!');

        const alertInfo = {
          vin: message.vin,
          timestamp: message.createdAt,
          sentryMode: sentryData.value.stringValue,
          centerDisplay: centerDisplayData?.value.displayStateValue || 'Unknown',
          location: 'Non disponible', // À améliorer si d'autres données sont disponibles
          batteryLevel: 'N/A', // À améliorer si d'autres données sont disponibles
          vehicleSpeed: '0', // À améliorer si d'autres données sont disponibles
          alarmState: 'Active'
        };

        await this.telegramService.sendSentryAlert(userId, alertInfo);
      } else {
        this.logger.log(`📊 Données télémétrie reçues (non-alerte): ${JSON.stringify(message.data)}`);
      }

    } catch (error) {
      this.logger.error('❌ Erreur lors du traitement du message télémétrie:', error);
    }
  }
}
