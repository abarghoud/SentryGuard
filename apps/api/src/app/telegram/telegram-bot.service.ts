import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Telegraf, Context } from 'telegraf';
import { TelegramConfig, TelegramLinkStatus } from '../../entities/telegram-config.entity';

@Injectable()
export class TelegramBotService implements OnModuleInit {
  private readonly logger = new Logger(TelegramBotService.name);
  private bot: Telegraf<Context> | null = null;
  private readonly botToken = process.env.TELEGRAM_BOT_TOKEN;

  constructor(
    @InjectRepository(TelegramConfig)
    private readonly telegramConfigRepository: Repository<TelegramConfig>,
  ) {}

  /**
   * Initialise le bot au démarrage du module
   */
  async onModuleInit() {
    if (!this.botToken) {
      this.logger.warn('⚠️ TELEGRAM_BOT_TOKEN not defined, Telegram bot disabled');
      return;
    }

    try {
      this.bot = new Telegraf(this.botToken);
      
      // Commande /start avec deep linking
      this.bot.start(async (ctx) => {
        const args = ctx.message.text.split(' ');
        
        if (args.length > 1) {
          // Token fourni dans le deep link
          const linkToken = args[1];
          await this.handleLinkToken(ctx, linkToken);
        } else {
          // Message par défaut
          await ctx.reply(
            '🚗 Bienvenue sur TeslaGuard Bot!\n\n' +
            'Pour lier votre compte, utilisez le lien fourni dans l\'application web.'
          );
        }
      });

      // Commande /status pour vérifier l'état de la liaison
      this.bot.command('status', async (ctx) => {
        const chatId = ctx.chat.id.toString();
        const config = await this.telegramConfigRepository.findOne({
          where: { chat_id: chatId, status: TelegramLinkStatus.LINKED }
        });

        if (config) {
          await ctx.reply('✅ Votre compte est lié et actif!');
        } else {
          await ctx.reply('❌ Aucun compte lié. Utilisez le lien depuis l\'application web.');
        }
      });

      // Commande /help
      this.bot.help(async (ctx) => {
        await ctx.reply(
          '📖 Commandes disponibles:\n\n' +
          '/start - Commencer et lier votre compte\n' +
          '/status - Vérifier l\'état de votre liaison\n' +
          '/help - Afficher cette aide'
        );
      });

      // Lancer le bot en mode polling
      await this.bot.launch();
      this.logger.log('✅ Telegram bot démarré avec succès');

      // Graceful stop
      process.once('SIGINT', () => this.bot?.stop('SIGINT'));
      process.once('SIGTERM', () => this.bot?.stop('SIGTERM'));
    } catch (error) {
      this.logger.error('❌ Erreur lors du démarrage du bot Telegram:', error);
    }
  }

  /**
   * Gère le token de liaison envoyé via /start
   */
  private async handleLinkToken(ctx: Context, linkToken: string): Promise<void> {
    try {
      // Rechercher le token dans la base de données
      const config = await this.telegramConfigRepository.findOne({
        where: { link_token: linkToken, status: TelegramLinkStatus.PENDING }
      });

      if (!config) {
        await ctx.reply('❌ Token invalide ou expiré. Veuillez générer un nouveau lien depuis l\'application.');
        return;
      }

      // Vérifier si le token n'est pas expiré
      if (config.expires_at && new Date() > config.expires_at) {
        config.status = TelegramLinkStatus.EXPIRED;
        await this.telegramConfigRepository.save(config);
        await ctx.reply('⏰ Ce token a expiré. Veuillez générer un nouveau lien depuis l\'application.');
        return;
      }

      // Associer le chat_id
      const chatId = ctx.chat.id.toString();
      config.chat_id = chatId;
      config.status = TelegramLinkStatus.LINKED;
      config.linked_at = new Date();
      await this.telegramConfigRepository.save(config);

      this.logger.log(`✅ Compte lié: userId=${config.userId}, chatId=${chatId}`);

      await ctx.reply(
        '✅ Votre compte TeslaGuard a été lié avec succès!\n\n' +
        'Vous recevrez désormais les alertes de votre véhicule ici.'
      );
    } catch (error) {
      this.logger.error('❌ Erreur lors de la liaison du token:', error);
      await ctx.reply('❌ Une erreur est survenue. Veuillez réessayer plus tard.');
    }
  }

  /**
   * Envoie un message à un utilisateur spécifique
   */
  async sendMessageToUser(userId: string, message: string): Promise<boolean> {
    if (!this.bot) {
      this.logger.warn('⚠️ Bot Telegram non initialisé');
      return false;
    }

    try {
      // Récupérer la configuration de l'utilisateur
      const config = await this.telegramConfigRepository.findOne({
        where: { userId, status: TelegramLinkStatus.LINKED }
      });

      if (!config || !config.chat_id) {
        this.logger.warn(`⚠️ Aucun chat_id trouvé pour l'utilisateur: ${userId}`);
        return false;
      }

      await this.bot.telegram.sendMessage(config.chat_id, message, {
        parse_mode: 'HTML'
      });

      this.logger.log(`📱 Message envoyé à l'utilisateur ${userId}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Erreur lors de l'envoi du message à ${userId}:`, error);
      return false;
    }
  }

  /**
   * Récupère le bot username depuis l'API
   */
  async getBotUsername(): Promise<string | null> {
    if (!this.bot) {
      return process.env.TELEGRAM_BOT_USERNAME || null;
    }

    try {
      const me = await this.bot.telegram.getMe();
      return me.username || null;
    } catch (error) {
      this.logger.error('❌ Erreur lors de la récupération du bot username:', error);
      return process.env.TELEGRAM_BOT_USERNAME || null;
    }
  }
}

