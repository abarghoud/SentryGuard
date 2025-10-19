import { Controller, Post, Body, Headers, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { TelemetryService } from './telemetry.service';

@Controller('sentry')
export class TelemetryController {
  private readonly logger = new Logger(TelemetryController.name);

  constructor(private readonly telemetryService: TelemetryService) {}

  @Post('alert')
  @HttpCode(HttpStatus.OK)
  async handleSentryAlert(
    @Body() data: any,
    @Headers('x-tesla-signature') signature?: string,
  ) {
    this.logger.log('🚨 ALERTE SENTINEL reçue!');
    
    try {
      // Vérifier la signature Tesla (optionnel mais recommandé)
      if (signature && !this.telemetryService.verifySignature(data, signature)) {
        this.logger.warn('⚠️ Signature Tesla invalide');
        return { status: 'error', message: 'Invalid signature' };
      }

      // Traiter l'alerte Sentinel
      await this.telemetryService.processSentryAlert(data);
      
      this.logger.log('✅ Alerte Sentinel traitée avec succès');
      return { status: 'success' };
    } catch (error) {
      this.logger.error('❌ Erreur lors du traitement de l\'alerte Sentinel:', error);
      return { status: 'error', message: 'Sentry alert processing failed' };
    }
  }
}