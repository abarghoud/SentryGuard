import { Injectable, Logger } from '@nestjs/common';
import { TelegramService } from '../telegram/telegram.service';

@Injectable()
export class TelemetryService {
  private readonly logger = new Logger(TelemetryService.name);

  constructor(private readonly telegramService: TelegramService) {}

  async processSentryAlert(data: any) {
    this.logger.log('🚨 Traitement de l\'alerte Sentinel');
    
    // Extraire les informations importantes
    const alertInfo = this.extractSentryAlertInfo(data);
    
    // Envoyer la notification Telegram
    await this.telegramService.sendSentryAlert(alertInfo);
  }

  async processTelemetryMessage(data: any) {
    this.logger.log('📡 Message télémétrie reçu');
    const alertInfo = this.extractSentryAlertInfo(data);

    // Filtrage basique: n'alerter que si sentryMode actif ou alarme
    const isSentry = alertInfo.sentryMode === true;
    const isAlarm = typeof alertInfo.alarmState === 'string' ? alertInfo.alarmState.toLowerCase() === 'active' : !!alertInfo.alarmState;
    if (isSentry || isAlarm) {
      await this.telegramService.sendSentryAlert(alertInfo);
    }
  }

  private extractSentryAlertInfo(data: any) {
    const location = data.location || data.Location;
    const formattedLocation = this.formatLocation(location);
    return {
      vin: data.vin || data.VIN,
      timestamp: this.normalizeTimestamp(data.timestamp || data.Timestamp),
      location: formattedLocation,
      batteryLevel: data.battery_level ?? data.Soc ?? data.soc,
      vehicleSpeed: data.vehicle_speed ?? data.VehicleSpeed ?? data.speed,
      alarmState: data.alarm_state ?? data.AlarmState,
      sentryMode: data.sentry_mode ?? data.SentryMode,
      rawData: data
    };
  }

  verifySignature(data: any, signature: string): boolean {
    // Implémenter la vérification de signature Tesla
    // Utiliser la clé publique Tesla pour vérifier la signature
    // Cette fonction doit être implémentée selon la documentation Tesla
    // Pour l'instant, on retourne true pour les tests
    this.logger.log('🔐 Vérification de la signature Tesla');
    return true; // Placeholder - à implémenter selon la doc Tesla
  }

  private formatLocation(loc: any): string | undefined {
    if (!loc) return undefined;
    if (typeof loc === 'string') return loc;
    const lat = loc.latitude ?? loc.lat;
    const lon = loc.longitude ?? loc.lon ?? loc.lng;
    if (typeof lat === 'number' && typeof lon === 'number') {
      return `${lat},${lon}`;
    }
    return JSON.stringify(loc);
  }

  private normalizeTimestamp(ts: any): string {
    if (!ts) return new Date().toISOString();
    if (typeof ts === 'number') {
      // heuristique: secondes vs ms
      const ms = ts < 1e12 ? ts * 1000 : ts;
      return new Date(ms).toISOString();
    }
    const d = new Date(ts);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
}