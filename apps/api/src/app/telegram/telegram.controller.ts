import {
  Controller,
  Post,
  Get,
  Delete,
  Logger,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import {
  TelegramConfig,
  TelegramLinkStatus,
} from '../../entities/telegram-config.entity';
import { TelegramBotService } from './telegram-bot.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ConsentGuard } from '../../common/guards/consent.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { User } from '../../entities/user.entity';
import i18n from '../../i18n';
import { ThrottleOptions } from '../../config/throttle.config';

@Controller('telegram')
@UseGuards(JwtAuthGuard, ConsentGuard)
export class TelegramController {
  private readonly logger = new Logger(TelegramController.name);
  private readonly LINK_EXPIRATION_MINUTES = 15;

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
    private readonly telegramBotService: TelegramBotService
  ) {}

  /**
   * Generate a Telegram linking URL for the authenticated user
   * POST /telegram/generate-link
   * Requires: Authorization Bearer JWT
   */
  @Throttle(ThrottleOptions.authenticatedWrite())
  @Post('generate-link')
  async generateLink(@CurrentUser() user: User) {
    const userId = user.userId;

    this.logger.log(
      `📱 Generating Telegram link for user: ${userId} (${user.email})`
    );

    const existingConfig = await this.telegramConfigRepository.findOne({
      where: { userId },
    });

    const linkToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + this.LINK_EXPIRATION_MINUTES);

    if (existingConfig) {
      existingConfig.link_token = linkToken;
      existingConfig.status = TelegramLinkStatus.PENDING;
      existingConfig.expires_at = expiresAt;
      await this.telegramConfigRepository.save(existingConfig);
    } else {
      const config = this.telegramConfigRepository.create({
        userId,
        link_token: linkToken,
        status: TelegramLinkStatus.PENDING,
        expires_at: expiresAt,
      });
      await this.telegramConfigRepository.save(config);
    }

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
   * Check Telegram link status for the authenticated user
   * GET /telegram/status
   * Requires: Authorization Bearer JWT
   */
  @Throttle(ThrottleOptions.authenticatedRead())
  @Get('status')
  async getStatus(@CurrentUser() user: User) {
    const userId = user.userId;

    this.logger.log(`🔍 Checking Telegram status for: ${userId}`);

    const config = await this.telegramConfigRepository.findOne({
      where: { userId },
    });

    if (!config) {
      return {
        linked: false,
        status: 'not_configured',
        message: 'Aucune configuration Telegram trouvée',
      };
    }

    if (
      config.status === TelegramLinkStatus.PENDING &&
      config.expires_at &&
      new Date() > config.expires_at
    ) {
      config.status = TelegramLinkStatus.EXPIRED;
      await this.telegramConfigRepository.save(config);
    }

    return {
      linked: config.status === TelegramLinkStatus.LINKED,
      status: config.status,
      linked_at: config.linked_at,
      expires_at: config.expires_at,
      message:
        config.status === TelegramLinkStatus.LINKED
          ? 'Compte Telegram lié'
          : config.status === TelegramLinkStatus.PENDING
          ? 'En attente de liaison'
          : 'Lien expiré',
    };
  }

  /**
   * Unlink Telegram account for the authenticated user
   * DELETE /telegram/unlink
   * Requires: Authorization Bearer JWT
   */
  @Throttle(ThrottleOptions.authenticatedWrite())
  @Delete('unlink')
  async unlinkAccount(@CurrentUser() user: User) {
    const userId = user.userId;

    this.logger.log(`🔓 Unlinking Telegram account for: ${userId}`);

    const result = await this.telegramConfigRepository.delete({ userId });

    if (result.affected === 0) {
      return {
        success: false,
        message: 'Aucune configuration Telegram trouvée',
      };
    }

    return {
      success: true,
      message: 'Compte Telegram dissocié avec succès',
    };
  }

  /**
   * Send a test message (for development)
   * POST /telegram/test-message
   * Requires: Authorization Bearer JWT
   * Body: { message: string }
   */
  @Throttle(ThrottleOptions.critical())
  @Post('test-message')
  async sendTestMessage(
    @CurrentUser() user: User,
    @Body('message') message?: string
  ) {
    const userId = user.userId;

    if (!message) {
      message = i18n.t('🧪 Test message from SentryGuard API');
    }

    this.logger.log(`📤 Sending test message to: ${userId} (${user.email})`);

    const success = await this.telegramBotService.sendMessageToUser(
      userId,
      message
    );

    return {
      success,
      message: success
        ? 'Message sent successfully'
        : 'Failed to send message. Verify that the account is linked.',
    };
  }
}
