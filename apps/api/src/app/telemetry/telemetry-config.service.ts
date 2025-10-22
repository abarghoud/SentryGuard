import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import axios from 'axios';
import * as https from 'https';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class TelemetryConfigService {
  private readonly logger = new Logger(TelemetryConfigService.name);
  private readonly teslaApi = axios.create({
    baseURL: 'https://tesla-vehicle-command:443',
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  constructor(private readonly authService: AuthService) {}

  /**
   * Récupère le token d'accès pour un utilisateur
   * Fallback sur ACCESS_TOKEN si userId non fourni (compatibilité)
   */
  private getAccessToken(userId?: string): string {
    if (userId) {
      const token = this.authService.getAccessToken(userId);
      if (!token) {
        throw new UnauthorizedException('Token invalide ou expiré pour cet utilisateur');
      }
      return token;
    }

    // Fallback sur l'ancien système avec ACCESS_TOKEN
    const legacyToken = process.env.ACCESS_TOKEN;
    if (!legacyToken) {
      throw new UnauthorizedException('Aucun token d\'accès disponible');
    }
    return legacyToken;
  }

  /**
   * Récupère la liste des véhicules configurés
   */
  async getVehicles(userId?: string): Promise<any[]> {
    try {
      const accessToken = this.getAccessToken(userId);
      const response = await this.teslaApi.get('/api/1/vehicles', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
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
  async configureTelemetry(vin: string, userId?: string): Promise<any> {
    const base64CAKey = process.env.LETS_ENCRYPT_CERTIFICATE;

    if (!base64CAKey) {
      this.logger.error('❌ LETS_ENCRYPT_CERTIFICATE non défini');
      return null;
    }

    const decodedKey = Buffer.from(base64CAKey, 'base64').toString('utf8');

    try {
      const accessToken = this.getAccessToken(userId);
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
          'Authorization': `Bearer ${accessToken}`,
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
  async checkTelemetryConfig(vin: string, userId?: string): Promise<any> {
    try {
      const accessToken = this.getAccessToken(userId);
      const response = await this.teslaApi.get(`/api/1/vehicles/${vin}/fleet_telemetry_config`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
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
  async configureAllVehicles(userId?: string): Promise<void> {
    this.logger.log('🔍 Récupération des véhicules...');
    const vehicles = await this.getVehicles(userId);

    if (vehicles.length === 0) {
      this.logger.warn('⚠️ Aucun véhicule trouvé.');
      return;
    }

    this.logger.log('Véhicules trouvés:', vehicles.map((v: any) => v.vin));

    // Configurer la télémétrie pour chaque véhicule
    for (const vehicle of vehicles) {
      this.logger.log(`\n🚗 Configuration ${vehicle.vin}...`);
      const configResult = await this.configureTelemetry(vehicle.vin, userId);
      this.logger.log('configResult', configResult);

      // Vérifier la configuration
      const checkResult = await this.checkTelemetryConfig(vehicle.vin, userId);
      if (checkResult) {
        this.logger.log(`✅ Configuration vérifiée pour ${vehicle.vin}:`, checkResult.fields);
      }
    }
  }
}
