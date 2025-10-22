import { Controller, Post, Get, Delete, Headers, Logger, Body, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import * as crypto from 'crypto';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';
import { TelegramBotService } from './telegram-bot.service';

@Controller('telegram')
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);
  private readonly LINK_EXPIRATION_MINUTES = 15;

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly telegramBotService: TelegramBotService,
  ) {}

  /**
   * Génère un lien de liaison Telegram pour l'utilisateur
   * POST /telegram/generate-link
   * Header: X-User-Id
   */
  @Post('generate-link')
  async generateLink(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      throw new BadRequestException('X-User-Id header is required');
    }

    this.logger.log(`📱 Génération d'un lien Telegram pour l'utilisateur: ${userId}`);

    // Vérifier s'il existe déjà une configuration
    const existingConfig = await this.telegramConfigRepository.findOne({
      where: { userId }
    });

    // Générer un token unique
    const linkToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.LINK_EXPIRATION_MINUTES);

    if (existingConfig) {
      // Mettre à jour le token existant
      existingConfig.link_token = linkToken;
      existingConfig.status = TelegramLinkStatus.PENDING;
      existingConfig.expires_at = expiresAt;
      await this.telegramConfigRepository.save(existingConfig);
    } else {
      // Créer une nouvelle configuration
      const config = this.telegramConfigRepository.create({
        userId,
        link_token: linkToken,
        status: TelegramLinkStatus.PENDING,
        expires_at: expiresAt,
      });
      await this.telegramConfigRepository.save(config);
    }

    // Récupérer le username du bot
    const botUsername = await this.telegramBotService.getBotUsername();
    
    if (!botUsername) {
      throw new BadRequestException('Bot username not configured');
    }

    const deepLink = `https://t.me/${botUsername}?start=${linkToken}`;

    this.logger.log(`✅ Lien généré pour ${userId}: ${deepLink}`);

    return {
      success: true,
      link: deepLink,
      token: linkToken,
      expires_at: expiresAt,
      expires_in_minutes: this.LINK_EXPIRATION_MINUTES,
    };
  }

  /**
   * Vérifie le statut de la liaison Telegram
   * GET /telegram/status
   * Header: X-User-Id
   */
  @Get('status')
  async getStatus(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      throw new BadRequestException('X-User-Id header is required');
    }

    this.logger.log(`🔍 Vérification du statut Telegram pour: ${userId}`);

    const config = await this.telegramConfigRepository.findOne({
      where: { userId }
    });

    if (!config) {
      return {
        linked: false,
        status: 'not_configured',
        message: 'Aucune configuration Telegram trouvée'
      };
    }

    // Vérifier si le lien a expiré
    if (config.status === TelegramLinkStatus.PENDING && config.expires_at && new Date() > config.expires_at) {
      config.status = TelegramLinkStatus.EXPIRED;
      await this.telegramConfigRepository.save(config);
    }

    return {
      linked: config.status === TelegramLinkStatus.LINKED,
      status: config.status,
      linked_at: config.linked_at,
      expires_at: config.expires_at,
      message: config.status === TelegramLinkStatus.LINKED 
        ? 'Compte Telegram lié' 
        : config.status === TelegramLinkStatus.PENDING
        ? 'En attente de liaison'
        : 'Lien expiré'
    };
  }

  /**
   * Dissocier le compte Telegram
   * DELETE /telegram/unlink
   * Header: X-User-Id
   */
  @Delete('unlink')
  async unlinkAccount(@Headers('x-user-id') userId?: string) {
    if (!userId) {
      throw new BadRequestException('X-User-Id header is required');
    }

    this.logger.log(`🔓 Dissociation du compte Telegram pour: ${userId}`);

    const result = await this.telegramConfigRepository.delete({ userId });

    if (result.affected === 0) {
      return {
        success: false,
        message: 'Aucune configuration Telegram trouvée'
      };
    }

    return {
      success: true,
      message: 'Compte Telegram dissocié avec succès'
    };
  }

  /**
   * Envoie un message de test (pour le développement)
   * POST /telegram/test-message
   * Header: X-User-Id
   * Body: { message: string }
   */
  @Post('test-message')
  async sendTestMessage(
    @Headers('x-user-id') userId: string,
    @Body('message') message?: string
  ) {
    if (!userId) {
      throw new BadRequestException('X-User-Id header is required');
    }

    if (!message) {
      message = '🧪 Message de test depuis TeslaGuard API';
    }

    this.logger.log(`📤 Envoi d'un message de test à: ${userId}`);

    const success = await this.telegramBotService.sendMessageToUser(userId, message);

    return {
      success,
      message: success 
        ? 'Message envoyé avec succès' 
        : 'Échec de l\'envoi du message. Vérifiez que le compte est lié.'
    };
  }

  /**
   * Nettoie les tokens expirés (tâche de maintenance)
   * POST /telegram/cleanup-expired
   */
  @Post('cleanup-expired')
  async cleanupExpiredTokens() {
    this.logger.log('🧹 Nettoyage des tokens expirés');

    const now = new Date();
    const result = await this.telegramConfigRepository.delete({
      status: TelegramLinkStatus.PENDING,
      expires_at: LessThan(now)
    });

    return {
      success: true,
      deleted: result.affected || 0,
      message: `${result.affected || 0} token(s) expiré(s) supprimé(s)`
    };
  }
}

