import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as crypto from 'crypto';
import * as https from 'https';
import { decode, TokenExpiredError } from 'jsonwebtoken';
import { User } from '../../entities/user.entity';
import { encrypt, decrypt } from '../../common/utils/crypto.util';
import { normalizeTeslaLocale } from '../../common/utils/language.util';
import { MissingPermissionsException } from '../../common/exceptions/missing-permissions.exception';
import { UserNotApprovedException } from '../../common/exceptions/user-not-approved.exception';
import { WaitlistService } from '../waitlist/services/waitlist.service';
import {
  TeslaTokenRefreshService,
  RefreshResult,
  REFRESH_TOKEN_LIFETIME_DAYS,
} from './services/tesla-token-refresh.service';

interface UserProfile {
  email?: string;
  full_name?: string;
  profile_image_url?: string;
  [key: string]: any;
}

interface StatePayload {
  type: 'oauth_state';
  userLocale: 'en' | 'fr';
  nonce: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // Axios instance for Tesla API (same configuration as TelemetryConfigService)
  // SECURITY NOTE: rejectUnauthorized: false is acceptable here because tesla-vehicle-command
  // is a local service on the same Docker network with self-signed certificate.
  // ⚠️ DO NOT use this configuration for calls to the public Internet!
  private readonly teslaApi = axios.create({
    baseURL:
      process.env.TESLA_API_BASE_URL || 'https://tesla-vehicle-command:443',
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly waitlistService: WaitlistService,
    private readonly teslaTokenRefreshService: TeslaTokenRefreshService
  ) {}

  /**
   * Generates a Tesla OAuth login URL
   */
  generateLoginUrl(userLocale: 'en' | 'fr' = 'en'): { url: string; state: string } {
    const clientId = process.env.TESLA_CLIENT_ID;
    const redirectUri =
      process.env.TESLA_REDIRECT_URI || 'https://sentryguard.org/callback/auth';

    if (!clientId) {
      throw new Error('TESLA_CLIENT_ID not defined');
    }

    const state = this.createSignedState(userLocale);

    const params = new URLSearchParams({
      client_id: clientId,
      locale: normalizeTeslaLocale(userLocale),
      prompt: 'login',
      redirect_uri: redirectUri,
      response_type: 'code',
      show_keypair_step: 'true',
      scope: 'openid vehicle_device_data offline_access user_data',
      state: state,
    });

    const url = `https://auth.tesla.com/oauth2/v3/authorize?${params.toString()}`;

    this.logger.log(`🔐 Login URL generated with locale: ${userLocale}`);
    return { url, state };
  }

  generateScopeChangeUrl(userLocale: 'en' | 'fr' = 'en', missingScopes?: string[]): { url: string; state: string } {
    const clientId = process.env.TESLA_CLIENT_ID;
    const redirectUri =
      process.env.TESLA_REDIRECT_URI || 'https://sentryguard.org/callback/auth';

    if (!clientId) {
      throw new Error('TESLA_CLIENT_ID not defined');
    }

    const state = this.createSignedState(userLocale);

    const params = new URLSearchParams({
      client_id: clientId,
      locale: normalizeTeslaLocale(userLocale),
      prompt_missing_scopes: 'true',
      redirect_uri: redirectUri,
      response_type: 'code',
      show_keypair_step: 'true',
      scope: 'openid vehicle_device_data offline_access user_data',
      state: state,
    });

    const url = `https://auth.tesla.com/oauth2/v3/authorize?${params.toString()}`;

    this.logger.log(`🔄 Scope change URL generated with locale: ${userLocale}${missingScopes ? ` (missing: ${missingScopes.join(', ')})` : ''}`);
    return { url, state };
  }

  private createSignedState(userLocale: 'en' | 'fr'): string {
    const payload: StatePayload = {
      type: 'oauth_state',
      userLocale,
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    const secret = process.env.JWT_OAUTH_STATE_SECRET;

    return this.jwtService.sign(payload, {
      expiresIn: '5m',
      secret,
    });
  }

  private validateOAuthState(state: string): { userLocale: 'en' | 'fr' } | null {
    try {
      const secret = process.env.JWT_OAUTH_STATE_SECRET;

      const decoded = this.jwtService.verify<StatePayload>(state, { secret });

      if (decoded.type !== 'oauth_state') {
        this.logger.warn('⚠️ Invalid state token type', decoded);
        return null;
      }

      return { userLocale: decoded.userLocale };
    } catch (error) {
      this.logger.warn('⚠️ Invalid or expired state JWT', error);
      return null;
    }
  }

  /**
   * Generates a JWT token for a user
   */
  private async generateJwtToken(
    userId: string,
    email: string
  ): Promise<{ token: string; expiresAt: Date }> {
    const payload = {
      sub: userId,
      email: email,
    };

    const token = await this.jwtService.signAsync(payload);

    // Calculate JWT expiration (default 30 days)
    const expiresIn = process.env.JWT_EXPIRATION || '30d';
    const expiresAt = new Date();

    // Parse expiration string (e.g., '30d', '7d', '24h')
    const match = expiresIn.match(/^(\d+)([dhm])$/);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case 'd':
          expiresAt.setDate(expiresAt.getDate() + value);
          break;
        case 'h':
          expiresAt.setHours(expiresAt.getHours() + value);
          break;
        case 'm':
          expiresAt.setMinutes(expiresAt.getMinutes() + value);
          break;
      }
    } else {
      // Default to 30 days if format is invalid
      expiresAt.setDate(expiresAt.getDate() + 30);
    }

    return { token, expiresAt };
  }

  async exchangeCodeForTokens(
    code: string,
    state: string
  ): Promise<{ jwt: string; userId: string; access_token: string }> {
    const pendingState = this.validateOAuthState(state);

    if (!pendingState) {
      throw new UnauthorizedException('Invalid or expired state');
    }

    const userLocale = pendingState.userLocale || 'en';

    try {
      const tokens = await this.exchangeCodeForTeslaTokens(code);
      const profile = await this.fetchUserProfileSafely(tokens.access_token);
      const userId = await this.createOrUpdateUser(tokens, profile, userLocale);

      const savedUser = await this.userRepository.findOne({
        where: { userId },
      });
      const jwt = savedUser?.jwt_token || '';

      return { jwt, userId, access_token: tokens.access_token };
    } catch (error: unknown) {
      if (
        error instanceof MissingPermissionsException ||
        error instanceof UnauthorizedException ||
        error instanceof UserNotApprovedException
      ) {
        throw error;
      }

      const errorData = (error as any)?.response?.data;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Error exchanging code:', errorData || errorMessage);

      throw new UnauthorizedException('Tesla authentication failed');
    }
  }

  /**
   * Exchanges authorization code for Tesla tokens
   */
  private async exchangeCodeForTeslaTokens(code: string): Promise<{
    access_token: string;
    refresh_token: string;
    expires_in: number;
    expiresAt: Date;
  }> {
    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    const audience =
      process.env.TESLA_AUDIENCE ||
      'https://fleet-api.prd.na.vn.cloud.tesla.com';
    const redirectUri =
      process.env.TESLA_REDIRECT_URI || 'https://sentryguard.org/callback/auth';

    if (!clientId || !clientSecret) {
      throw new Error('TESLA_CLIENT_ID or TESLA_CLIENT_SECRET not defined');
    }

    this.logger.log('🔄 Exchanging authorization code for tokens...');

    const response = await axios.post(
      'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        audience: audience,
        redirect_uri: redirectUri,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token, refresh_token, expires_in } = response.data;

    // Validate JWT scopes
    this.validateJwtScopes(access_token);

    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

    this.logger.log(`📅 Tesla token expiration: ${expiresAt.toISOString()}`);

    return { access_token, refresh_token, expires_in, expiresAt };
  }

  /**
   * Validates JWT scopes in the access token
   */
  private validateJwtScopes(accessToken: string): void {
    const decodedToken = decode(accessToken) as any;
    if (!decodedToken || !decodedToken.scp) {
      throw new UnauthorizedException('Invalid JWT token: missing scopes');
    }

    const requiredScopes = ['openid', 'vehicle_device_data', 'offline_access', 'user_data'];
    const tokenScopes = decodedToken.scp as string[];
    const missingScopes = requiredScopes.filter(scope => !tokenScopes.includes(scope));

    if (missingScopes.length > 0) {
      this.logger.warn(`⚠️ Missing required scopes: ${missingScopes.join(', ')}`);
      throw new MissingPermissionsException(missingScopes);
    }

    this.logger.log(`✅ JWT scopes validated: ${tokenScopes.join(', ')}`);
  }

  /**
   * Fetches user profile safely with error handling
   */
  private async fetchUserProfileSafely(accessToken: string): Promise<UserProfile | undefined> {
    try {
      const profile = await this.fetchUserProfile(accessToken);
      this.logger.log(
        `👤 User profile retrieved: ${profile?.email || 'N/A'}`
      );
      return profile;
    } catch (error) {
      this.logger.warn(
        '⚠️ Unable to retrieve user profile, continuing anyway'
      );
      return undefined;
    }
  }

  private async createOrUpdateUser(
    tokens: { access_token: string; refresh_token: string; expiresAt: Date },
    profile: UserProfile | undefined,
    userLocale: 'en' | 'fr'
  ): Promise<string> {
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    const existingUser = profile?.email ? await this.userRepository.findOne({
      where: { email: profile.email },
    }) : null;

    if (existingUser) {
      return this.updateExistingUser(existingUser, tokens, profile, encryptedAccessToken, encryptedRefreshToken);
    }

    await this.verifyWaitlistApproval(profile, userLocale);

    return this.createNewUser(tokens, profile, encryptedAccessToken, encryptedRefreshToken, userLocale);
  }

  private async verifyWaitlistApproval(
    profile: UserProfile | undefined,
    userLocale: 'en' | 'fr'
  ): Promise<void> {
    if (!profile?.email) {
      return;
    }

    const isApproved = await this.waitlistService.isApproved(profile.email);

    if (!isApproved) {
      await this.waitlistService.addToWaitlist(
        profile.email,
        profile.full_name,
        userLocale
      );
      throw new UserNotApprovedException(profile.email);
    }
  }

  /**
   * Updates an existing user
   */
  private async updateExistingUser(
    user: User,
    tokens: { expiresAt: Date },
    profile: UserProfile | undefined,
    encryptedAccessToken: string,
    encryptedRefreshToken: string
  ): Promise<string> {
    user.access_token = encryptedAccessToken;
    user.refresh_token = encryptedRefreshToken;
    user.expires_at = tokens.expiresAt;
    user.full_name = profile?.full_name;
    user.profile_image_url = profile?.profile_image_url;

    const userId = user.userId;

    const jwtData = await this.generateJwtToken(userId, user.email || '');
    user.jwt_token = jwtData.token;
    user.jwt_expires_at = tokens.expiresAt;
    user.token_revoked_at = undefined;

    const now = new Date();
    user.refresh_token_updated_at = now;
    const refreshTokenExpiresAt = new Date(now);
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS);
    user.refresh_token_expires_at = refreshTokenExpiresAt;

    await this.userRepository.save(user);

    this.logger.log(`✅ User updated in database: ${userId}`);
    this.logger.log(
      `🔐 JWT token generated, expires at: ${jwtData.expiresAt.toISOString()}`
    );

    return userId;
  }

  private async createNewUser(
    tokens: { expiresAt: Date },
    profile: UserProfile | undefined,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
    userLocale: 'en' | 'fr'
  ): Promise<string> {
    const userId = crypto.randomBytes(16).toString('hex');

    const jwtData = await this.generateJwtToken(
      userId,
      profile?.email || ''
    );

    const now = new Date();
    const refreshTokenExpiresAt = new Date(now);
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS);

    const newUser = this.userRepository.create({
      userId,
      email: profile?.email,
      full_name: profile?.full_name,
      profile_image_url: profile?.profile_image_url,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: tokens.expiresAt,
      jwt_token: jwtData.token,
      jwt_expires_at: tokens.expiresAt,
      preferred_language: userLocale,
      token_revoked_at: undefined,
      refresh_token_updated_at: now,
      refresh_token_expires_at: refreshTokenExpiresAt,
    });

    await this.userRepository.save(newUser);

    this.logger.log(`✅ New user created in database: ${userId} with locale: ${userLocale}`);
    this.logger.log(
      `🔐 JWT token generated, expires at: ${jwtData.expiresAt.toISOString()}`
    );

    return userId;
  }

  /**
   * Validates a JWT token and returns the user
   */
  async validateJwtToken(jwt: string): Promise<User | null> {
    try {
      const payload = await this.jwtService.verifyAsync(jwt);
      const user = await this.userRepository.findOne({
        where: { userId: payload.sub },
      });

      if (!user || user.jwt_token !== jwt) {
        this.logger.warn(`⚠️ Invalid JWT token`);
        return null;
      }

      const now = new Date();
      if (user.jwt_expires_at && now > user.jwt_expires_at) {
        this.logger.warn(`⚠️ JWT expired for user: ${user.userId}`);
        return null;
      }

      return user;
    } catch (error) {
      if (!(error instanceof TokenExpiredError)) {
        this.logger.error(`❌ Failed to validate JWT token:`, error);
      }
      
      return null;
    }
  }

  private async getAccessTokenByUserId(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(`⚠️ No user found: ${userId}`);
      return null;
    }

    // Check if token has expired
    const now = new Date();
    if (now > user.expires_at) {
      this.logger.warn(`⚠️ Tesla token expired for user: ${userId}`);

      const refreshResult =
        await this.teslaTokenRefreshService.refreshTokenForUser(userId);

      if (
        refreshResult !== RefreshResult.Success &&
        refreshResult !== RefreshResult.AlreadyRefreshed
      ) {
        return null;
      }

      const refreshedUser = await this.userRepository.findOne({
        where: { userId },
      });

      if (!refreshedUser) {
        return null;
      }

      return this.decryptAccessTokenSafely(refreshedUser);
    }

    return this.decryptAccessTokenSafely(user);
  }

  private decryptAccessTokenSafely(user: User): string | null {
    try {
      return decrypt(user.access_token);
    } catch (error) {
      this.logger.error(`❌ Failed to decrypt token for user: ${user.userId}`);
      return null;
    }
  }

  /**
   * Gets the access token for the authenticated user
   */
  async getAccessToken(user: User): Promise<string | null> {
    return this.getAccessTokenByUserId(user.userId);
  }

  /**
   * Gets the access token for a user by their user ID (public method)
   */
  async getAccessTokenForUserId(userId: string): Promise<string | null> {
    return this.getAccessTokenByUserId(userId);
  }

  /**
   * Checks if a user has a valid token
   */
  async hasValidToken(user: User): Promise<boolean> {
    const token = await this.getAccessTokenByUserId(user.userId);
    return token !== null;
  }

  /**
   * Fetches user profile from Tesla API
   */
  private async fetchUserProfile(accessToken: string): Promise<UserProfile> {
    try {
      const response = await this.teslaApi.get('/api/1/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.response || response.data;
    } catch (error: unknown) {
      const errorData = (error as any)?.response?.data;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        '❌ Error retrieving profile:',
        errorData || errorMessage
      );
      throw new Error('Unable to retrieve user profile');
    }
  }


  /**
   * Revokes a user's JWT token
   */
  async revokeJwtToken(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (user) {
      user.jwt_token = undefined;
      user.jwt_expires_at = undefined;
      await this.userRepository.save(user);
      this.logger.log(`🔓 JWT token revoked for user: ${userId}`);
    }
  }

  /**
   * Invalidates all tokens for a user when their Tesla OAuth token is revoked
   *
   * @param userId - The ID of the user whose tokens should be invalidated
   */
  async invalidateUserTokens(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(`⚠️ Cannot invalidate tokens: user not found: ${userId}`);
      return;
    }

    user.jwt_token = null;
    user.jwt_expires_at = null;
    user.token_revoked_at = new Date();

    await this.userRepository.save(user);

    this.logger.warn(
      `🔒 All tokens invalidated for user ${userId} due to Tesla token revocation`
    );
  }
}
