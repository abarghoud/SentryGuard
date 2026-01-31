import { Controller, Get, Logger, UseGuards, Headers, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '../../entities/user.entity';
import { extractPreferredLanguage } from '../../common/utils/language.util';
import { ThrottleOptions } from '../../config/throttle.config';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Throttle(ThrottleOptions.publicSensitive())
  @Get('tesla/login')
  loginWithTesla(
    @Headers('accept-language') acceptLanguage?: string
  ): { url: string; state: string; message: string } {
    const userLocale = extractPreferredLanguage(acceptLanguage);
    this.logger.log(`🚀 New Tesla OAuth login request with locale: ${userLocale}`);

    const { url, state } = this.authService.generateLoginUrl(userLocale);

    return {
      url,
      state,
      message: 'Use this URL to authenticate with Tesla',
    };
  }

  @Throttle(ThrottleOptions.publicSensitive())
  @Get('tesla/scope-change')
  scopeChangeWithTesla(
    @Headers('accept-language') acceptLanguage?: string,
    @Query('missing') missing?: string
  ): { url: string; state: string; message: string } {
    const userLocale = extractPreferredLanguage(acceptLanguage);
    const missingScopes = missing ? missing.split(',').map(s => s.trim()) : undefined;

    this.logger.log(`🔄 New Tesla OAuth scope change request with locale: ${userLocale}${missingScopes ? ` (missing: ${missingScopes.join(', ')})` : ''}`);

    const { url, state } = this.authService.generateScopeChangeUrl(userLocale, missingScopes);

    return {
      url,
      state,
      message: 'Use this URL to grant additional permissions to SentryGuard',
    };
  }

  /**
   * Get current user's authentication status
   * GET /auth/status
   * Requires: Authorization: Bearer <jwt>
   */
  @Throttle(ThrottleOptions.authenticatedRead())
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getAuthStatus(@CurrentUser() user: User) {
    this.logger.log(`🔍 Checking JWT status for user: ${user.userId}`);

    const now = new Date();
    const isValid = !!user.jwt_expires_at && now < user.jwt_expires_at;

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
  @Throttle(ThrottleOptions.authenticatedRead())
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
  @Throttle(ThrottleOptions.authenticatedRead())
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
  @Throttle(ThrottleOptions.authenticatedWrite())
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
}
