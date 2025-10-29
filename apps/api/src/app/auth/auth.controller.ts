import { Controller, Get, Logger, UseGuards, Headers } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '../../entities/user.entity';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Initiate Tesla OAuth login
   * GET /auth/tesla/login
   */
  @Get('tesla/login')
  loginWithTesla(): { url: string; state: string; message: string } {
    this.logger.log('🚀 New Tesla OAuth login request');

    const { url, state } = this.authService.generateLoginUrl();

    return {
      url,
      state,
      message: 'Use this URL to authenticate with Tesla',
    };
  }

  /**
   * Get current user's authentication status
   * GET /auth/status
   * Requires: Authorization: Bearer <jwt>
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getAuthStatus(@CurrentUser() user: User) {
    this.logger.log(`🔍 Checking JWT status for user: ${user.userId}`);

    const now = new Date();
    const isValid = user.jwt_expires_at && now < user.jwt_expires_at;

    return {
      authenticated: isValid,
      userId: user.userId,
      email: user.email,
      expires_at: user.expires_at,
      jwt_expires_at: user.jwt_expires_at,
      created_at: user.created_at,
      has_profile: !!(user.email || user.full_name),
      message: isValid
        ? 'Valid JWT token'
        : 'JWT token expired, please re-authenticate',
    };
  }

  /**
   * Get current user's profile
   * GET /auth/profile
   * Requires: Authorization: Bearer <jwt>
   */
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User): Promise<{
    success: boolean;
    profile: {
      userId: string;
      email?: string;
      full_name?: string;
      profile_image_url?: string;
    };
  }> {
    this.logger.log(`👤 Retrieving profile for user: ${user.userId}`);

    return {
      success: true,
      profile: {
        userId: user.userId,
        email: user.email,
        full_name: user.full_name,
        profile_image_url: user.profile_image_url,
      },
    };
  }

  /**
   * Validate a JWT token
   * GET /auth/validate
   * Requires: Authorization header with Bearer token
   */
  @Get('validate')
  async validateToken(
    @Headers('authorization') authorization?: string
  ): Promise<{
    valid: boolean;
    userId?: string;
    email?: string;
    message?: string;
  }> {
    if (!authorization || !authorization.startsWith('Bearer ')) {
      return {
        valid: false,
        message: 'No Bearer token provided',
      };
    }

    const jwt = authorization.substring(7);
    const user = await this.authService.validateJwtToken(jwt);

    if (!user) {
      return {
        valid: false,
        message: 'Invalid or expired token',
      };
    }

    return {
      valid: true,
      userId: user.userId,
      email: user.email,
      message: 'Token is valid',
    };
  }

  /**
   * Revoke current user's JWT token (logout)
   * GET /auth/logout
   * Requires: Authorization: Bearer <jwt>
   */
  @Get('logout')
  @UseGuards(JwtAuthGuard)
  async logout(@CurrentUser() user: User): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`🔓 Logging out user: ${user.userId}`);

    await this.authService.revokeJwtToken(user.userId);

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  /**
   * Authentication service statistics
   * GET /auth/stats
   */
  @Get('stats')
  async getStats() {
    return await this.authService.getStats();
  }
}
