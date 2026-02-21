import { Controller, Get, Query, Logger, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { ThrottleOptions } from '../../config/throttle.config';
import { MissingPermissionsException } from '../../common/exceptions/missing-permissions.exception';
import { UserNotApprovedException } from '../../common/exceptions/user-not-approved.exception';

@Controller('callback')
export class CallbackController {
  private readonly logger = new Logger(CallbackController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint de callback OAuth Tesla
   * GET /callback/auth?code=xxx&state=xxx&locale=en-US&issuer=xxx
   */
  @Throttle(ThrottleOptions.publicSensitive())
  @Get('auth')
  async handleTeslaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('locale') locale: string,
    @Query('issuer') issuer: string,
    @Query('error') error: string,
    @Query('error_description') errorDescription: string,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log('🔄 Receiving Tesla OAuth callback');
    this.logger.log(`📝 Locale: ${locale}, Issuer: ${issuer}`);

    if (error) {
      this.logger.log(`ℹ️ Tesla OAuth returned an error: ${error} - ${errorDescription}`);
      const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
      const params = new URLSearchParams({ error });
      if (errorDescription) {
        params.set('error_description', errorDescription);
      }
      res.redirect(`${webappUrl}/callback?${params.toString()}`);
      return;
    }

    if (!code || !state) {
      this.logger.error('❌ Missing code or state in callback');
      const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
      res.redirect(`${webappUrl}/callback?error=missing_parameters`);
      return;
    }



    try {
      const { jwt, userId } = await this.authService.exchangeCodeForTokens(
        code,
        state
      );

      this.logger.log(`✅ Authentication successful for user: ${userId}`);
      this.logger.log(`🔐 JWT token generated for secure session`);

      const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
      const redirectUrl = `${webappUrl}/callback#token=${encodeURIComponent(jwt)}`;
      res.redirect(redirectUrl);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (error instanceof UserNotApprovedException) {
        this.logger.log(`User added to waitlist: ${error.email}`);
        const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
        const redirectUrl = `${webappUrl}/waitlist?email=${encodeURIComponent(error.email)}`;
        res.redirect(redirectUrl);
        return;
      }

      if (!(error instanceof MissingPermissionsException)) {
        this.logger.error('❌ Error processing callback:', errorMessage);
      }

      const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
      const redirectUrl = `${webappUrl}/callback?error=${encodeURIComponent(errorMessage)}`;
      res.redirect(redirectUrl);
    }
  }
}
