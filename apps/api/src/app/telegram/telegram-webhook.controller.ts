import {
  Controller,
  Post,
  Param,
  Req,
  Res,
  ForbiddenException,
  NotFoundException,
  Logger,
  HttpCode,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { TelegramBotService } from './telegram-bot.service';

@Controller('telegram')
export class TelegramWebhookController {
  private readonly logger = new Logger(TelegramWebhookController.name);

  constructor(private readonly telegramBotService: TelegramBotService) {}

  @Post('webhook/:secret')
  @HttpCode(200)
  async handleWebhook(
    @Param('secret') secret: string,
    @Req() req: Request,
    @Res() res: Response
  ) {
    const expectedSecret = this.telegramBotService.getWebhookSecretPath();
    if (secret !== expectedSecret) {
      this.logger.warn(`Tentative webhook avec secret invalide: ${secret}`);
      throw new NotFoundException();
    }

    const headerSecret = this.telegramBotService.getWebhookSecretToken();
    if (headerSecret) {
      const provided = req.headers['x-telegram-bot-api-secret-token'];
      if (provided !== headerSecret) {
        this.logger.warn('Tentative webhook avec secret token invalide');
        throw new ForbiddenException();
      }
    }

    return this.telegramBotService.handleUpdate(req, res);
  }
}


