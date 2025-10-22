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
      message: 'Use this URL to authenticate with Tesla'
    };
  }

  /**
   * Checks a user's authentication status
   * GET /auth/user/:userId/status
   */
  @Get('user/:userId/status')
  async getUserStatus(@Param('userId') userId: string) {
    this.logger.log(`🔍 Checking status for user: ${userId}`);

    const tokenInfo = await this.authService.getTokenInfo(userId);

    if (!tokenInfo.exists) {
      return {
        authenticated: false,
        message: 'No token found for this user'
      };
    }

    const now = new Date();
    const isValid = tokenInfo.expires_at && now < tokenInfo.expires_at;

    return {
      authenticated: isValid,
      expires_at: tokenInfo.expires_at,
      created_at: tokenInfo.created_at,
      has_profile: tokenInfo.has_profile,
      message: isValid 
        ? 'Valid token' 
        : 'Token expired, please re-authenticate'
    };
  }

  /**
   * Gets the Tesla user profile
   * GET /auth/user/:userId/profile
   */
  @Get('user/:userId/profile')
  async getUserProfile(@Param('userId') userId: string): Promise<{
    success: boolean;
    profile?: {
      email?: string;
      full_name?: string;
      profile_image_url?: string;
    };
    message?: string;
  }> {
    this.logger.log(`👤 Retrieving profile for user: ${userId}`);

    const profile = await this.authService.getUserProfile(userId);

    if (!profile) {
      return {
        success: false,
        message: 'Profile not found or token expired'
      };
    }

    return {
      success: true,
      profile
    };
  }

  /**
   * Statistiques du service d'authentification
   * GET /auth/stats
   */
  @Get('stats')
  async getStats() {
    return await this.authService.getStats();
  }
}
