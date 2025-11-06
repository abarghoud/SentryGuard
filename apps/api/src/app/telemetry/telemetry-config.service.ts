import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as https from 'https';
import { AuthService } from '../auth/auth.service';
import { Vehicle } from '../../entities/vehicle.entity';

@Injectable()
export class TelemetryConfigService {
  private readonly logger = new Logger(TelemetryConfigService.name);

  // NOTE SÉCURITÉ: rejectUnauthorized: false est acceptable ici car tesla-vehicle-command
  // est un service local sur le même réseau Docker avec certificat auto-signé.
  // ⚠️ NE PAS utiliser cette configuration pour des appels vers Internet public !
  private readonly teslaApi = axios.create({
    baseURL:
      process.env.TESLA_API_BASE_URL || 'https://tesla-vehicle-command:443',
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  /**
   * Récupère le token d'accès pour un utilisateur
   */
  private async getAccessToken(userId: string): Promise<string> {
    const token = await this.authService.getAccessTokenForUserId(userId);
    if (!token) {
      throw new UnauthorizedException(
        'Token invalide ou expiré pour cet utilisateur'
      );
    }
    return token;
  }

  /**
   * Récupère la liste des véhicules depuis l'API Tesla
   * et les synchronise avec la base de données
   */
  async getVehicles(userId: string): Promise<any[]> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const response = await this.teslaApi.get('/api/1/vehicles', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const vehicles = response.data.response;

      // Si userId est fourni, synchroniser avec la base de données et enrichir avec telemetry_enabled et key_paired
      if (userId && vehicles.length > 0) {
        const telemetryConfigs = await this.syncVehiclesToDatabase(userId, vehicles);

        // Récupérer les véhicules depuis la DB avec le statut telemetry_enabled
        const dbVehicles = await this.getUserVehiclesFromDB(userId);

        // Vérifier le statut key_paired pour le premier véhicule (suffisant pour le compte)
        let keyPaired = false;
        if (vehicles.length > 0 && telemetryConfigs.size > 0) {
          const firstConfig = telemetryConfigs.get(vehicles[0].vin);
          keyPaired = firstConfig?.key_paired || false;
        }

        // Enrichir les véhicules Tesla avec les données de la DB et key_paired
        return vehicles.map((teslaVehicle: any) => {
          const dbVehicle = dbVehicles.find(
            (dbV) => dbV.vin === teslaVehicle.vin
          );
          return {
            ...teslaVehicle,
            telemetry_enabled: dbVehicle?.telemetry_enabled || false,
            key_paired: keyPaired,
          };
        });
      }

      return vehicles;
    } catch (error: unknown) {
      this.logger.error(
        'Erreur lors de la récupération des véhicules:',
        (error as any)?.response?.data || (error as any)?.message
      );
      return [];
    }
  }

  /**
   * Synchronise les véhicules de l'API Tesla avec la base de données
   * Retourne un Map des configurations de télémétrie par VIN
   */
  private async syncVehiclesToDatabase(
    userId: string,
    teslaVehicles: any[]
  ): Promise<Map<string, any>> {
    const telemetryConfigsMap = new Map<string, any>();

    for (const teslaVehicle of teslaVehicles) {
      const telemetryConfig = await this.checkTelemetryConfig(
        teslaVehicle.vin,
        userId
      );
      telemetryConfigsMap.set(teslaVehicle.vin, telemetryConfig);
      
      const isTelemetryConfigured = telemetryConfig && telemetryConfig.config !== null;

      const existingVehicle = await this.vehicleRepository.findOne({
        where: { userId, vin: teslaVehicle.vin },
      });

      if (!existingVehicle) {
        // Créer un nouveau véhicule
        const vehicle = this.vehicleRepository.create({
          userId,
          vin: teslaVehicle.vin,
          display_name: teslaVehicle.display_name || teslaVehicle.vin,
          model: teslaVehicle.vehicle_state?.car_type || null,
          telemetry_enabled: isTelemetryConfigured,
        });

        await this.vehicleRepository.save(vehicle);
        this.logger.log(`✅ Véhicule ajouté à la DB: ${teslaVehicle.vin} (télémétrie: ${isTelemetryConfigured})`);
      } else {
        // Mettre à jour le nom si changé
        if (
          teslaVehicle.display_name &&
          existingVehicle.display_name !== teslaVehicle.display_name
        ) {
          existingVehicle.display_name = teslaVehicle.display_name;
        }
        
        existingVehicle.telemetry_enabled = isTelemetryConfigured;
        await this.vehicleRepository.save(existingVehicle);
        this.logger.log(`✅ Véhicule mis à jour: ${teslaVehicle.vin} (télémétrie: ${isTelemetryConfigured})`);
      }
    }

    return telemetryConfigsMap;
  }

  /**
   * Récupère les véhicules d'un utilisateur depuis la base de données
   */
  async getUserVehiclesFromDB(userId: string): Promise<Vehicle[]> {
    return await this.vehicleRepository.find({
      where: { userId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Configure la télémétrie pour un véhicule spécifique
   */
  async configureTelemetry(vin: string, userId: string): Promise<any> {
    const base64CAKey = process.env.LETS_ENCRYPT_CERTIFICATE;

    if (!base64CAKey) {
      this.logger.error('❌ LETS_ENCRYPT_CERTIFICATE non défini');
      return null;
    }

    const decodedKey = Buffer.from(base64CAKey, 'base64').toString('utf8');

    try {
      const accessToken = await this.getAccessToken(userId);
      const response = await this.teslaApi.post(
        '/api/1/vehicles/fleet_telemetry_config',
        {
          config: {
            ca: decodedKey,
            hostname: process.env.TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME,
            port: 12345,
            fields: {
              SentryMode: { interval_seconds: 30 },
            },
          },
          vins: [vin],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(`✅ Télémétrie configurée pour le VIN: ${vin}`);

      // Mettre à jour le statut dans la base de données
      if (userId) {
        await this.updateVehicleTelemetryStatus(userId, vin, true);
      }

      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        `Erreur pour le VIN ${vin}:`,
        (error as any)?.response?.data || (error as any)?.message
      );
      return null;
    }
  }

  /**
   * Met à jour le statut de télémétrie d'un véhicule
   */
  async updateVehicleTelemetryStatus(
    userId: string,
    vin: string,
    enabled: boolean
  ): Promise<void> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { userId, vin },
    });

    if (vehicle) {
      vehicle.telemetry_enabled = enabled;
      await this.vehicleRepository.save(vehicle);
      this.logger.log(
        `✅ Statut télémétrie mis à jour pour ${vin}: ${enabled}`
      );
    }
  }

  /**
   * Vérifie la configuration de télémétrie pour un véhicule
   */
  async checkTelemetryConfig(vin: string, userId: string): Promise<any> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const response = await this.teslaApi.get(
        `/api/1/vehicles/${vin}/fleet_telemetry_config`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      this.logger.log(`Config pour ${vin}:`, response.data.response);
      return response.data.response;
    } catch (error) {
      this.logger.error(
        `Erreur lors de la vérification pour ${vin}:`,
        (error as any)?.response?.data || (error as any)?.message
      );
      return null;
    }
  }

  /**
   * Configure la télémétrie pour tous les véhicules disponibles
   */
  async configureAllVehicles(userId: string): Promise<void> {
    this.logger.log('🔍 Récupération des véhicules...');
    const vehicles = await this.getVehicles(userId);

    if (vehicles.length === 0) {
      this.logger.warn('⚠️ Aucun véhicule trouvé.');
      return;
    }

    this.logger.log(
      'Véhicules trouvés:',
      vehicles.map((v: any) => v.vin)
    );

    // Configurer la télémétrie pour chaque véhicule
    for (const vehicle of vehicles) {
      this.logger.log(`\n🚗 Configuration ${vehicle.vin}...`);
      const configResult = await this.configureTelemetry(vehicle.vin, userId);
      this.logger.log('configResult', configResult);

      // Vérifier la configuration
      const checkResult = await this.checkTelemetryConfig(vehicle.vin, userId);
      if (checkResult) {
        this.logger.log(
          `✅ Configuration vérifiée pour ${vehicle.vin}:`,
          checkResult.fields
        );
      }
    }
  }
}
