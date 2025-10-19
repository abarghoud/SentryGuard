import { Controller, Post, Get, Param, Logger } from '@nestjs/common';
import { TelemetryConfigService } from './telemetry-config.service';

@Controller('telemetry-config')
export class TelemetryConfigController {
  private readonly logger = new Logger(TelemetryConfigController.name);

  constructor(private readonly telemetryConfigService: TelemetryConfigService) {}

  @Get('vehicles')
  async getVehicles() {
    this.logger.log('🔍 Récupération de la liste des véhicules');
    return await this.telemetryConfigService.getVehicles();
  }

  @Post('configure-all')
  async configureAllVehicles() {
    this.logger.log('🚗 Configuration de la télémétrie pour tous les véhicules');
    await this.telemetryConfigService.configureAllVehicles();
    return { message: 'Configuration de télémétrie lancée pour tous les véhicules' };
  }

  @Post('configure/:vin')
  async configureVehicle(@Param('vin') vin: string) {
    this.logger.log(`🚗 Configuration de la télémétrie pour le VIN: ${vin}`);
    const result = await this.telemetryConfigService.configureTelemetry(vin);
    return { message: `Configuration lancée pour le VIN: ${vin}`, result };
  }

  @Get('check/:vin')
  async checkConfiguration(@Param('vin') vin: string) {
    this.logger.log(`🔍 Vérification de la configuration pour le VIN: ${vin}`);
    const result = await this.telemetryConfigService.checkTelemetryConfig(vin);
    return { message: `Configuration vérifiée pour le VIN: ${vin}`, result };
  }
}
