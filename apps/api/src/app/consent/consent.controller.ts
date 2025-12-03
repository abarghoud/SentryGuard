import {
  Controller,
  Get,
  Post,
  Body,
  Request,
  UseGuards,
  Logger,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConsentService } from './consent.service';
import type { ConsentData, ConsentStatus, ConsentTextResponse } from './consent.service';
import type { User } from '../../entities/user.entity';

@Controller('consent')
export class ConsentController {
  private readonly logger = new Logger(ConsentController.name);

  constructor(private readonly consentService: ConsentService) {}

  @Get('text')
  async getConsentText(
    @Query('version') version = 'v1',
    @Query('locale') locale = 'en',
  ): Promise<ConsentTextResponse> {
    return this.consentService.getConsentText(version, locale);
  }

  @Get('current')
  @UseGuards(JwtAuthGuard)
  async getCurrentConsent(@CurrentUser() user: User): Promise<ConsentStatus> {
    return await this.consentService.getCurrentConsent(user.userId);
  }

  @Post('accept')
  @UseGuards(JwtAuthGuard)
  async acceptConsent(
    @CurrentUser() user: User,
    @Body() consentData: ConsentData,
    @Request() req: Request & { get: (header: string) => string | undefined },
  ): Promise<{ success: boolean; consent: { id: string; acceptedAt: Date; version: string } }> {
    const userAgent = req.get('User-Agent') || '';

    const fullConsentData: ConsentData = {
      ...consentData,
      userAgent,
      appTitle: 'SentryGuard',
      partnerName: 'SentryGuardOrg',
    };

    this.logger.log(`User ${user.userId} accepting consent`);

    const consent = await this.consentService.acceptConsent(user.userId, fullConsentData);
    return {
      success: true,
      consent: {
        id: consent.id,
        acceptedAt: consent.acceptedAt,
        version: consent.version,
      },
    };
  }

  @Post('revoke')
  @UseGuards(JwtAuthGuard)
  async revokeConsent(@CurrentUser() user: User): Promise<{ success: boolean; message: string }> {
    await this.consentService.revokeConsent(user.userId);
    return { success: true, message: 'Consent revoked successfully' };
  }

}
