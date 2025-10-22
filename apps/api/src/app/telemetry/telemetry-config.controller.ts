import { Controller, Post, Get, Param, Logger, Headers } from '@nestjs/common';
import { TelemetryConfigService } from './telemetry-config.service';

@Controller('telemetry-config')
export class TelemetryConfigController {
  private readonly logger = new Logger(TelemetryConfigController.name);

  constructor(private readonly telemetryConfigService: TelemetryConfigService) {}

  @Get('vehicles')
  async getVehicles(@Headers('x-user-id') userId?: string) {
    this.logger.log(`🔍 Récupération de la liste des véhicules${userId ? ` pour l'utilisateur ${userId}` : ''}`);
    return await this.telemetryConfigService.getVehicles(userId);
  }

  @Post('configure-all')
  async configureAllVehicles(@Headers('x-user-id') userId?: string) {
    this.logger.log(`🚗 Configuration de la télémétrie pour tous les véhicules${userId ? ` (utilisateur ${userId})` : ''}`);
    await this.telemetryConfigService.configureAllVehicles(userId);
    return { message: 'Configuration de télémétrie lancée pour tous les véhicules' };
  }

  @Post('configure/:vin')
  async configureVehicle(@Param('vin') vin: string, @Headers('x-user-id') userId?: string) {
    this.logger.log(`🚗 Configuration de la télémétrie pour le VIN: ${vin}${userId ? ` (utilisateur ${userId})` : ''}`);
    const result = await this.telemetryConfigService.configureTelemetry(vin, userId);
    return { message: `Configuration lancée pour le VIN: ${vin}`, result };
  }

  @Get('check/:vin')
  async checkConfiguration(@Param('vin') vin: string, @Headers('x-user-id') userId?: string) {
    this.logger.log(`🔍 Vérification de la configuration pour le VIN: ${vin}${userId ? ` (utilisateur ${userId})` : ''}`);
    const result = await this.telemetryConfigService.checkTelemetryConfig(vin, userId);
    return { message: `Configuration vérifiée pour le VIN: ${vin}`, result };
  }
}
