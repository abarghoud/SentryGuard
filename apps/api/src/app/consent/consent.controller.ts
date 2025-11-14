import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Request,
  UseGuards,
  Logger,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { ConsentService, ConsentData, ConsentStatus } from './consent.service';

@Controller('consent')
@UseGuards(JwtAuthGuard)
export class ConsentController {
  private readonly logger = new Logger(ConsentController.name);

  constructor(private readonly consentService: ConsentService) {}

  @Get('current')
  async getCurrentConsent(@CurrentUser() user: any): Promise<ConsentStatus> {
    return await this.consentService.getCurrentConsent(user.userId);
  }

  @Get('history')
  async getConsentHistory(@CurrentUser() user: any): Promise<any[]> {
    return await this.consentService.getConsentHistory(user.userId);
  }

  @Post('accept')
  async acceptConsent(
    @CurrentUser() user: any,
    @Body() consentData: ConsentData,
    @Request() req: any,
  ): Promise<any> {
    // Extract IP and user agent from request
    const ipAddress = this.getClientIP(req);
    const userAgent = req.get('User-Agent') || '';

    const fullConsentData: ConsentData = {
      ...consentData,
      ipAddress,
      userAgent,
      appTitle: 'TeslaGuard', // Fixed app title
      partnerName: 'SentryGuardOrg', // Fixed partner name
    };

    this.logger.log(`User ${user.userId} accepting consent from IP ${ipAddress}`);

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
  async revokeConsent(@CurrentUser() user: any): Promise<any> {
    await this.consentService.revokeConsent(user.userId);
    return { success: true, message: 'Consent revoked successfully' };
  }

  @Get('export')
  async exportConsents(@Res() res: Response): Promise<void> {
    // TODO: Add admin role check
    const consents = await this.consentService.exportConsents();

    // Generate CSV
    const csvHeader = 'userId,email,version,textHash,acceptedAt,locale,ipAddress,userAgent,appTitle,partnerName,revokedAt\n';
    const csvRows = consents.map(consent =>
      `"${consent.userId}","${consent.user.email || ''}","${consent.version}","${consent.textHash}","${consent.acceptedAt.toISOString()}","${consent.locale}","${consent.ipAddress}","${consent.userAgent.replace(/"/g, '""')}","${consent.appTitle}","${consent.partnerName}","${consent.revokedAt?.toISOString() || ''}"`
    ).join('\n');

    const csv = csvHeader + csvRows;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="consents-export.csv"');
    res.send(csv);
  }

  private getClientIP(req: any): string {
    const forwarded = req.get('x-forwarded-for');
    const realIP = req.get('x-real-ip');
    const clientIP = req.get('x-client-ip');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    if (realIP) {
      return realIP;
    }
    if (clientIP) {
      return clientIP;
    }

    return req.connection?.remoteAddress ||
           req.socket?.remoteAddress ||
           req.connection?.socket?.remoteAddress ||
           'unknown';
  }
}
