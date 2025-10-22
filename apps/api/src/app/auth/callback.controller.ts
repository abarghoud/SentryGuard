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
    this.logger.log('🔄 Réception du callback Tesla OAuth');
    this.logger.log(`📝 Locale: ${locale}, Issuer: ${issuer}`);

    if (!code || !state) {
      this.logger.error('❌ Code ou state manquant dans le callback');
      res.status(400).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Erreur d'authentification</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #d32f2f; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Erreur d'authentification</h1>
            <p>Paramètres manquants dans le callback OAuth.</p>
          </body>
        </html>
      `);
      return;
    }

    try {
      const { userId, access_token } = await this.authService.exchangeCodeForTokens(code, state);

      this.logger.log(`✅ Authentification réussie pour l'utilisateur: ${userId}`);

      res.status(200).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Authentification réussie</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                max-width: 600px; 
                margin: 50px auto; 
                padding: 20px; 
                text-align: center;
                background-color: #f5f5f5;
              }
              .success { 
                color: #2e7d32; 
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              h1 { color: #2e7d32; margin-bottom: 20px; }
              .user-id { 
                background: #e8f5e9; 
                padding: 15px; 
                border-radius: 5px; 
                font-family: monospace; 
                word-break: break-all;
                margin: 20px 0;
              }
              .info { color: #666; font-size: 14px; margin-top: 20px; }
              .token-preview {
                background: #f5f5f5;
                padding: 10px;
                border-radius: 5px;
                font-family: monospace;
                font-size: 12px;
                margin: 15px 0;
                color: #666;
              }
            </style>
          </head>
          <body>
            <div class="success">
              <h1>✅ Authentification réussie !</h1>
              <p>Votre compte Tesla a été connecté avec succès.</p>
              
              <h3>Votre identifiant utilisateur :</h3>
              <div class="user-id">${userId}</div>
              
              <div class="token-preview">
                Token: ${access_token.substring(0, 20)}...
              </div>
              
              <div class="info">
                <p>⚠️ Conservez cet identifiant pour accéder aux endpoints de l'API.</p>
                <p>💡 Utilisez-le dans vos requêtes avec le header: <code>X-User-Id: ${userId}</code></p>
              </div>
            </div>
          </body>
        </html>
      `);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      this.logger.error('❌ Erreur lors du traitement du callback:', errorMessage);

      res.status(401).send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>Erreur d'authentification</title>
            <style>
              body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; text-align: center; }
              .error { color: #d32f2f; }
              h1 { color: #333; }
            </style>
          </head>
          <body>
            <h1 class="error">❌ Échec de l'authentification</h1>
            <p>${errorMessage}</p>
            <p><a href="/auth/tesla/login">Réessayer</a></p>
          </body>
        </html>
      `);
    }
  }
}

