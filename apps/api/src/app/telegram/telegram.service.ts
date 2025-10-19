import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class TelegramService {
  private readonly logger = new Logger(TelegramService.name);
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;
  private readonly chatId = process.env.TELEGRAM_CHAT_ID;

  async sendSentryAlert(alertInfo: any) {
    try {
      const message = this.formatSentryAlertMessage(alertInfo);
      
      await axios.post(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
        chat_id: this.chatId,
        text: message,
        parse_mode: 'HTML'
      });

      this.logger.log('📱 Notification Telegram envoyée avec succès');
    } catch (error) {
      this.logger.error('❌ Erreur lors de l\'envoi de la notification Telegram:', error);
    }
  }

  private formatSentryAlertMessage(alertInfo: any): string {
    return `
🚨 <b>ALERTE SENTINEL TESLA</b> 🚨

🚗 <b>Véhicule:</b> ${alertInfo.vin}
⏰ <b>Heure:</b> ${new Date(alertInfo.timestamp).toLocaleString('fr-FR')}
📍 <b>Localisation:</b> ${alertInfo.location || 'Non disponible'}
🔋 <b>Batterie:</b> ${alertInfo.batteryLevel || 'N/A'}%
🚗 <b>Vitesse:</b> ${alertInfo.vehicleSpeed || '0'} km/h
🔔 <b>État d'alarme:</b> ${alertInfo.alarmState || 'Active'}

<i>Mode Sentinel activé - Vérifiez votre véhicule!</i>
    `.trim();
  }
}
