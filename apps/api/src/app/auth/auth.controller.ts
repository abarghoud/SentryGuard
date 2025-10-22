import { Controller, Get, Logger, Param } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Endpoint pour initier la connexion Tesla OAuth
   * GET /auth/tesla/login
   */
  @Get('tesla/login')
  loginWithTesla(): { url: string; state: string; message: string } {
    this.logger.log('🚀 Nouvelle demande de connexion Tesla OAuth');
    
    const { url, state } = this.authService.generateLoginUrl();
    
    return {
      url,
      state,
      message: 'Utilisez cette URL pour vous authentifier avec Tesla'
    };
  }

  /**
   * Vérifie le statut d'authentification d'un utilisateur
   * GET /auth/user/:userId/status
   */
  @Get('user/:userId/status')
  getUserStatus(@Param('userId') userId: string) {
    this.logger.log(`🔍 Vérification du statut pour l'utilisateur: ${userId}`);

    const tokenInfo = this.authService.getTokenInfo(userId);

    if (!tokenInfo.exists) {
      return {
        authenticated: false,
        message: 'Aucun token trouvé pour cet utilisateur'
      };
    }

    const now = new Date();
    const isValid = tokenInfo.expires_at && now < tokenInfo.expires_at;

    return {
      authenticated: isValid,
      expires_at: tokenInfo.expires_at,
      created_at: tokenInfo.created_at,
      message: isValid 
        ? 'Token valide' 
        : 'Token expiré, veuillez vous réauthentifier'
    };
  }

  /**
   * Statistiques du service d'authentification
   * GET /auth/stats
   */
  @Get('stats')
  getStats() {
    return this.authService.getStats();
  }
}

