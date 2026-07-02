import { Controller, Get, Inject, Logger, Post, UnauthorizedException, UseGuards, Headers, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { AccessTokenService } from './services/access-token.service';
import type { OAuthProviderRequirements } from './interfaces/oauth-provider.requirements';
import { oauthProviderRequirementsSymbol } from './interfaces/oauth-provider.requirements';
import { JwtAuthGuard } from './jwt-auth.guard';
import { CurrentUser } from './current-user.decorator';
import { User } from '../../entities/user.entity';
import { extractPreferredLanguage } from '../../common/utils/language.util';
import { ThrottleOptions } from '../../config/throttle.config';
import { TeslaScopes } from '@sentryguard/beta-domain';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly accessTokenService: AccessTokenService,
    @Inject(oauthProviderRequirementsSymbol)
    private readonly oauthProvider: OAuthProviderRequirements
  ) { }

  @Throttle(ThrottleOptions.publicSensitive())
  @Get('tesla/login')
  loginWithTesla(
    @Headers('accept-language') acceptLanguage?: string,
    @Query('redirect_uri') mobileRedirectUri?: string
  ): { url: string; state: string; message: string } {
    const userLocale = extractPreferredLanguage(acceptLanguage);
    this.logger.log(`New Tesla OAuth login request with locale: ${userLocale}`);

    const { url, state } = this.oauthProvider.generateLoginUrl(userLocale, mobileRedirectUri);

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
    @Query('missing') missing?: string,
    @Query('redirect_uri') mobileRedirectUri?: string
  ): { url: string; state: string; message: string } {
    const userLocale = extractPreferredLanguage(acceptLanguage);
    const missingScopes = missing ? missing.split(',').map(s => s.trim()) : undefined;

    this.logger.log(`New Tesla OAuth scope change request with locale: ${userLocale}${missingScopes ? ` (missing: ${missingScopes.join(', ')})` : ''}`);

    const { url, state } = this.oauthProvider.generateScopeChangeUrl(userLocale, missingScopes as TeslaScopes[], mobileRedirectUri);

    return {
      url,
      state,
      message: 'Use this URL to grant additional permissions to SentryGuard',
    };
  }

  @Throttle(ThrottleOptions.authenticatedRead())
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getAuthStatus(
    @CurrentUser() user: User,
    @Headers('authorization') authorization?: string
  ) {
    this.logger.log(`Checking JWT status for user: ${user.userId}`);

    const jwt = this.extractBearerJwt(authorization);
    const session = await this.authService.getActiveJwtSession(jwt);
    const isValid = !!session;

    return {
      authenticated: isValid,
      userId: user.userId,
      email: user.email,
      expires_at: user.expires_at,
      jwt_expires_at: session?.expires_at ?? null,
      created_at: user.created_at,
      has_profile: !!(user.email || user.full_name),
      message: isValid
        ? 'Valid JWT token'
        : 'JWT token expired, please re-authenticate',
    };
  }

  @Throttle(ThrottleOptions.authenticatedRead())
  @Get('profile')
  @UseGuards(JwtAuthGuard)
  async getProfile(@CurrentUser() user: User): Promise<{
    success: boolean;
    profile: {
      userId: string;
      email?: string;
      full_name?: string;
      isBetaTester: boolean;
    };
  }> {
    this.logger.log(`Retrieving profile for user: ${user.userId}`);

    return {
      success: true,
      profile: {
        userId: user.userId,
        email: user.email,
        full_name: user.full_name,
        isBetaTester: user.is_beta_tester,
      },
    };
  }

  @Throttle(ThrottleOptions.authenticatedRead())
  @Post('refresh-session')
  async refreshSession(@Headers('authorization') authorization?: string): Promise<{
    jwt: string;
    jwt_expires_at: Date;
    success: boolean;
    userId: string;
  }> {
    const jwt = this.extractBearerJwt(authorization);
    const user = await this.authService.getRefreshableJwtUser(jwt);

    if (!user || !(await this.accessTokenService.getAccessTokenForUserId(user.userId))) {
      throw new UnauthorizedException('Session cannot be refreshed');
    }

    const session = await this.authService.refreshJwtSession(user.userId, jwt);

    if (!session) {
      throw new UnauthorizedException('Session cannot be refreshed');
    }

    return { success: true, userId: user.userId, ...session };
  }

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

  @Throttle(ThrottleOptions.authenticatedRead())
  @Get('vehicle-commands-authorized')
  @UseGuards(JwtAuthGuard)
  async getVehicleCommandsAuthorization(@CurrentUser() user: User): Promise<{
    authorized: boolean;
  }> {
    this.logger.log(
      `Checking vehicle commands authorization for user: ${user.userId}`
    );

    const authorized = await this.accessTokenService.hasVehicleCommandsScope(
      user.userId
    );

    return {
      authorized,
    };
  }

  @Throttle(ThrottleOptions.authenticatedWrite())
  @Get('logout')
  @UseGuards(JwtAuthGuard)
  async logout(
    @CurrentUser() user: User,
    @Headers('authorization') authorization?: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(`Logging out user: ${user.userId}`);

    await this.authService.revokeJwtToken(user.userId, this.extractBearerJwt(authorization));

    return {
      success: true,
      message: 'Successfully logged out',
    };
  }

  private extractBearerJwt(authorization?: string): string {
    if (!authorization?.startsWith('Bearer ')) {
      throw new UnauthorizedException('No Bearer token provided');
    }

    return authorization.substring(7);
  }
}
