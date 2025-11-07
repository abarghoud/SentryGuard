import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TelegramService } from '../telegram/telegram.service';
import { Vehicle } from '../../entities/vehicle.entity';
import { User } from '../../entities/user.entity';
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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
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
  private async getUserIdFromVin(vin: string): Promise<{ userId: string, display_name?: string } | null> {
    try {
      const vehicle = await this.vehicleRepository.findOne({
        where: { vin },
        select: ['userId', 'display_name'],
      });

      if (vehicle) {
        this.logger.log(
          `👤 Utilisateur trouvé pour le VIN ${vin}: ${vehicle.userId}`
        );

        return vehicle;
      } else {
        this.logger.warn(`⚠️ Aucun véhicule trouvé pour le VIN: ${vin}`);
        return null;
      }
    } catch (error) {
      this.logger.error(
        `❌ Erreur lors de la récupération de l'utilisateur pour le VIN ${vin}:`,
        error
      );
      return null;
    }
  }

  private async listenForMessages() {
    for await (const message of this.socket) {
      try {
        // ZMQ peut envoyer plusieurs frames, on les concatène tous
        const messageParts = Array.isArray(message) ? message : [message];
        const fullMessage = messageParts
          .map((part) => part.toString())
          .join('');

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

          await this.processTelemetryMessage(telemetryData);
        } catch (parseError) {
          this.logger.error('❌ Erreur de parsing JSON:', parseError);
          this.logger.log(`Message reçu: ${jsonStr}`);
        }
      } catch (error) {
        this.logger.error(
          '❌ Erreur lors du traitement du message ZMQ:',
          error
        );
      }
    }
  }

  private async processTelemetryMessage(message: TelemetryMessage) {
    try {
      this.logger.log(
        `🚗 Traitement des données télémétrie pour VIN: ${message.vin}`
      );

      // Récupérer l'userId à partir du VIN
      const vehicle = await this.getUserIdFromVin(message.vin);

      if (!vehicle) {
        this.logger.warn(
          `⚠️ Impossible de trouver l'utilisateur pour le VIN: ${message.vin}`
        );
        return;
      }

      const user = await this.userRepository.findOne({
        where: { userId: vehicle.userId },
        select: ['debug_messages'],
      });

      if (user?.debug_messages) {
        const jsonStr = JSON.stringify(message);
        await this.telegramService.sendTelegramMessage(vehicle.userId, jsonStr);
      }

      const sentryData = message.data.find((item) => item.key === 'SentryMode');

      if (sentryData && sentryData.value.stringValue === 'Aware') {
        this.logger.log('🚨 Alerte Sentry détectée!');

        const alertInfo = {
          vin: message.vin,
          display_name: vehicle.display_name
        };

        await this.telegramService.sendSentryAlert(vehicle.userId, alertInfo);
      } else {
        this.logger.log(
          `📊 Données télémétrie reçues (non-alerte): ${JSON.stringify(
            message.data
          )}`
        );
      }
    } catch (error) {
      this.logger.error(
        '❌ Erreur lors du traitement du message télémétrie:',
        error
      );
    }
  }
}
