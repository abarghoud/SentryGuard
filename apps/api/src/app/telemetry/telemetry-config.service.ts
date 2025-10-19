import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as https from 'https';

@Injectable()
export class TelemetryConfigService {
  private readonly logger = new Logger(TelemetryConfigService.name);
  private readonly teslaApi = axios.create({
    baseURL: 'https://tesla-vehicle-command:443',
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  /**
   * Récupère la liste des véhicules configurés
   */
  async getVehicles(): Promise<any[]> {
    try {
      const response = await this.teslaApi.get('/api/1/vehicles', {
        headers: { 'Authorization': `Bearer ${process.env.ACCESS_TOKEN}` }
      });
      return response.data.response;
    } catch (error: unknown) {
      this.logger.error('Erreur lors de la récupération des véhicules:', (error as any)?.response?.data || (error as any)?.message);
      return [];
    }
  }

  /**
   * Configure la télémétrie pour un véhicule spécifique
   */
  async configureTelemetry(vin: string): Promise<any> {
    const base64CAKey = process.env.LETS_ENCRYPT_CERTIFICATE;

    if (!base64CAKey) {
      this.logger.error('❌ LETS_ENCRYPT_CERTIFICATE non défini');
      return null;
    }

    if (!process.env.ACCESS_TOKEN) {
      this.logger.error('❌ ACCESS_TOKEN non défini');
      return null;
    }

    const decodedKey = Buffer.from(base64CAKey, 'base64').toString('utf8');

    try {
      const response = await this.teslaApi.post('/api/1/vehicles/fleet_telemetry_config', {
        config: {
          ca: decodedKey,
          hostname: "sentryguard.org",
          port: 12345,
          fields: {
            SentryMode: { interval_seconds: 30 },
          }
        },
        vins: [vin]
      }, {
        headers: {
          'Authorization': `Bearer ${process.env.ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });

      this.logger.log(`✅ Télémétrie configurée pour le VIN: ${vin}`);
      return response.data;
    } catch (error: unknown) {
      this.logger.error(`Erreur pour le VIN ${vin}:`, (error as any)?.response?.data || (error as any)?.message);
      return null;
    }
  }

  /**
   * Vérifie la configuration de télémétrie pour un véhicule
   */
  async checkTelemetryConfig(vin: string): Promise<any> {
    try {
      const response = await this.teslaApi.get(`/api/1/vehicles/${vin}/fleet_telemetry_config`, {
        headers: { 'Authorization': `Bearer ${process.env.ACCESS_TOKEN}` }
      });

      this.logger.log(`Config pour ${vin}:`, response.data.response);
      return response.data.response;
    } catch (error) {
      this.logger.error(`Erreur lors de la vérification pour ${vin}:`, (error as any)?.response?.data || (error as any)?.message);
      return null;
    }
  }

  /**
   * Configure la télémétrie pour tous les véhicules disponibles
   */
  async configureAllVehicles(): Promise<void> {
    this.logger.log('🔍 Récupération des véhicules...');
    const vehicles = await this.getVehicles();

    if (vehicles.length === 0) {
      this.logger.warn('⚠️ Aucun véhicule trouvé.');
      return;
    }

    this.logger.log('Véhicules trouvés:', vehicles.map((v: any) => v.vin));

    // Configurer la télémétrie pour chaque véhicule
    for (const vehicle of vehicles) {
      this.logger.log(`\n🚗 Configuration ${vehicle.vin}...`);
      const configResult = await this.configureTelemetry(vehicle.vin);
      this.logger.log('configResult', configResult);

      // Vérifier la configuration
      const checkResult = await this.checkTelemetryConfig(vehicle.vin);
      if (checkResult) {
        this.logger.log(`✅ Configuration vérifiée pour ${vehicle.vin}:`, checkResult.fields);
      }
    }
  }
}
