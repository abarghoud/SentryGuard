import { Controller, Get, Query, Logger, Res } from '@nestjs/common';
import type { Response } from 'express';
import { AuthService } from './auth.service';

@Controller('callback')
export class CallbackController {
  private readonly logger = new Logger(CallbackController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint de callback OAuth Tesla
   * GET /callback/auth?code=xxx&state=xxx&locale=en-US&issuer=xxx
   */
  @Get('auth')
  async handleTeslaCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('locale') locale: string,
    @Query('issuer') issuer: string,
    @Res() res: Response
  ): Promise<void> {
    this.logger.log('🔄 Receiving Tesla OAuth callback');
    this.logger.log(`📝 Locale: ${locale}, Issuer: ${issuer}`);

    if (!code || !state) {
      this.logger.error('❌ Missing code or state in callback');
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Authentication Error</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #d32f2f; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Authentication error</h1>
            <p>Missing parameters in OAuth callback.</p>
          </body>
        </html>
      `);
      return;
    }



    try {
      const { jwt, userId } = await this.authService.exchangeCodeForTokens(
        code,
        state
      );

      this.logger.log(`✅ Authentication successful for user: ${userId}`);
      this.logger.log(`🔐 JWT token generated for secure session`);

      // Redirect to webapp with JWT token instead of userId
      const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
      const redirectUrl = `${webappUrl}/callback?token=${encodeURIComponent(jwt)}`;
      res.redirect(redirectUrl);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Error processing callback:', errorMessage);

      // Redirect to webapp with error
      const webappUrl = process.env.WEBAPP_URL || 'http://localhost:4200';
      const redirectUrl = `${webappUrl}/callback?error=${encodeURIComponent(errorMessage)}`;
      res.redirect(redirectUrl);
    }
  }
}
