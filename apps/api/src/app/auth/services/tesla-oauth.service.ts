import {
  Injectable,
  Logger,
  OnModuleInit,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import axios from 'axios';
import * as crypto from 'crypto';
import * as https from 'https';
import { decode } from 'jsonwebtoken';
import { normalizeTeslaLocale } from '../../../common/utils/language.util';
import { MissingPermissionsException } from '../../../common/exceptions/missing-permissions.exception';
import {
  OAuthProviderRequirements,
  OAuthAuthenticationResult,
  OAuthTokensResponse,
  OAuthUserProfile,
} from '../interfaces/oauth-provider.requirements';

interface StatePayload {
  type: 'oauth_state';
  userLocale: 'en' | 'fr';
  nonce: string;
}

@Injectable()
export class TeslaOAuthService implements OAuthProviderRequirements, OnModuleInit {
  private readonly logger = new Logger(TeslaOAuthService.name);
  // SECURITY NOTE: rejectUnauthorized: false is acceptable here because tesla-vehicle-command
  // is a local service on the same Docker network with self-signed certificate.
  private readonly teslaApi = axios.create({
    baseURL:
      process.env.TESLA_API_BASE_URL || 'https://tesla-vehicle-command:443',
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  constructor(private readonly jwtService: JwtService) {}

  onModuleInit(): void {
    if (!process.env.JWT_OAUTH_STATE_SECRET) {
      throw new Error(
        'JWT_OAUTH_STATE_SECRET environment variable is required'
      );
    }
  }

  generateLoginUrl(
    userLocale: 'en' | 'fr' = 'en'
  ): { url: string; state: string } {
    const clientId = process.env.TESLA_CLIENT_ID;
    const redirectUri =
      process.env.TESLA_REDIRECT_URI ||
      'https://sentryguard.org/callback/auth';

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

    this.logger.log(`Login URL generated with locale: ${userLocale}`);
    return { url, state };
  }

  generateScopeChangeUrl(
    userLocale: 'en' | 'fr' = 'en',
    missingScopes?: string[]
  ): { url: string; state: string } {
    const clientId = process.env.TESLA_CLIENT_ID;
    const redirectUri =
      process.env.TESLA_REDIRECT_URI ||
      'https://sentryguard.org/callback/auth';

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

    this.logger.log(
      `Scope change URL generated with locale: ${userLocale}${missingScopes ? ` (missing: ${missingScopes.join(', ')})` : ''}`
    );
    return { url, state };
  }

  async authenticateWithCode(
    code: string,
    state: string
  ): Promise<OAuthAuthenticationResult> {
    const userLocale = this.validateOAuthState(state);
    const tokens = await this.exchangeCodeForTokens(code);
    const profile = await this.fetchUserProfileSafely(tokens.access_token);

    return { tokens, profile, userLocale };
  }

  private validateOAuthState(state: string): 'en' | 'fr' {
    try {
      const secret = process.env.JWT_OAUTH_STATE_SECRET;

      const decoded = this.jwtService.verify<StatePayload>(state, {
        secret,
      });

      if (decoded.type !== 'oauth_state') {
        this.logger.warn(`Invalid state token type: ${decoded.type}`);
        throw new UnauthorizedException('Invalid or expired state');
      }

      return decoded.userLocale || 'en';
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      this.logger.warn('Invalid or expired state JWT');
      throw new UnauthorizedException('Invalid or expired state');
    }
  }

  private async exchangeCodeForTokens(
    code: string
  ): Promise<OAuthTokensResponse> {
    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    const audience =
      process.env.TESLA_AUDIENCE ||
      'https://fleet-api.prd.na.vn.cloud.tesla.com';
    const redirectUri =
      process.env.TESLA_REDIRECT_URI ||
      'https://sentryguard.org/callback/auth';

    if (!clientId || !clientSecret) {
      throw new Error('TESLA_CLIENT_ID or TESLA_CLIENT_SECRET not defined');
    }

    this.logger.log('Exchanging authorization code for tokens...');

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

    this.validateJwtScopes(access_token);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

    this.logger.log(`Tesla token expiration: ${expiresAt.toISOString()}`);

    return { access_token, refresh_token, expires_in, expiresAt };
  }

  private validateJwtScopes(accessToken: string): void {
    const decodedToken = decode(accessToken) as Record<string, unknown> | null;
    if (!decodedToken || !decodedToken.scp) {
      throw new UnauthorizedException(
        'Invalid JWT token: missing scopes'
      );
    }

    const requiredScopes = [
      'openid',
      'vehicle_device_data',
      'offline_access',
      'user_data',
    ];
    const tokenScopes = decodedToken.scp as string[];
    const missingScopes = requiredScopes.filter(
      (scope) => !tokenScopes.includes(scope)
    );

    if (missingScopes.length > 0) {
      this.logger.warn(
        `Missing required scopes: ${missingScopes.join(', ')}`
      );
      throw new MissingPermissionsException(missingScopes);
    }

    this.logger.log(`JWT scopes validated: ${tokenScopes.join(', ')}`);
  }

  private async fetchUserProfile(
    accessToken: string
  ): Promise<OAuthUserProfile> {
    try {
      const response = await this.teslaApi.get('/api/1/users/me', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      return response.data.response || response.data;
    } catch (error: unknown) {
      const errorData = (error as { response?: { data?: unknown } })?.response?.data;
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        'Error retrieving profile:',
        errorData || errorMessage
      );
      throw new Error('Unable to retrieve user profile');
    }
  }

  private async fetchUserProfileSafely(
    accessToken: string
  ): Promise<OAuthUserProfile | undefined> {
    try {
      const profile = await this.fetchUserProfile(accessToken);
      this.logger.log(
        `User profile retrieved: ${profile?.email || 'N/A'}`
      );
      return profile;
    } catch {
      this.logger.warn(
        'Unable to retrieve user profile, continuing anyway'
      );
      return undefined;
    }
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
}
