import { Injectable, Logger, UnauthorizedException, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import * as https from 'https';
import { User } from '../../entities/user.entity';
import { encrypt, decrypt } from '../../common/utils/crypto.util';

interface UserProfile {
  email?: string;
  full_name?: string;
  profile_image_url?: string;
  [key: string]: any;
}

interface PendingState {
  state: string;
  created_at: Date;
}

@Injectable()
export class AuthService implements OnModuleDestroy {
  private readonly logger = new Logger(AuthService.name);
  private readonly pendingStates = new Map<string, PendingState>();
  private readonly STATE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  private cleanupInterval: NodeJS.Timeout;

  // Axios instance for Tesla API (same configuration as TelemetryConfigService)
  // SECURITY NOTE: rejectUnauthorized: false is acceptable here because tesla-vehicle-command
  // is a local service on the same Docker network with self-signed certificate.
  // ⚠️ DO NOT use this configuration for calls to the public Internet!
  private readonly teslaApi = axios.create({
    baseURL: process.env.TESLA_API_BASE_URL || 'https://tesla-vehicle-command:443',
    httpsAgent: new https.Agent({
      rejectUnauthorized: false
    })
  });

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    // Clean expired states every minute
    this.cleanupInterval = setInterval(() => this.cleanupExpiredStates(), 60 * 1000);
  }

  /**
   * Cleanup when the module is destroyed
   */
  onModuleDestroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }

  /**
   * Generates a Tesla OAuth login URL
   */
  generateLoginUrl(): { url: string; state: string } {
    const state = crypto.randomBytes(32).toString('hex');
    const clientId = process.env.TESLA_CLIENT_ID;
    const redirectUri = process.env.TESLA_REDIRECT_URI || 'https://sentryguard.org/callback/auth';

    if (!clientId) {
      throw new Error('TESLA_CLIENT_ID not defined');
    }

    // Store state temporarily
    this.pendingStates.set(state, {
      state,
      created_at: new Date()
    });

    const params = new URLSearchParams({
      client_id: clientId,
      locale: 'en-US',
      prompt: 'login',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'openid vehicle_device_data offline_access user_data',
      state: state
    });

    const url = `https://auth.tesla.com/oauth2/v3/authorize?${params.toString()}`;

    this.logger.log(`🔐 Login URL generated with state: ${state}`);
    return { url, state };
  }

  /**
   * Validates OAuth state
   */
  private validateState(state: string): boolean {
    const pendingState = this.pendingStates.get(state);

    if (!pendingState) {
      this.logger.warn(`⚠️ Invalid or expired state: ${state}`);
      return false;
    }

    const now = new Date();
    const elapsed = now.getTime() - pendingState.created_at.getTime();

    if (elapsed > this.STATE_TIMEOUT_MS) {
      this.logger.warn(`⚠️ Expired state: ${state}`);
      this.pendingStates.delete(state);
      return false;
    }

    // Delete state after validation
    this.pendingStates.delete(state);
    return true;
  }

  /**
   * Exchanges the authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<{ userId: string; access_token: string }> {
    // Validate state
    if (!this.validateState(state)) {
      throw new UnauthorizedException('Invalid or expired state');
    }

    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    const audience = process.env.TESLA_AUDIENCE || 'https://fleet-api.prd.na.vn.cloud.tesla.com';
    const redirectUri = process.env.TESLA_REDIRECT_URI || 'https://sentryguard.org/callback/auth';

    if (!clientId || !clientSecret) {
      throw new Error('TESLA_CLIENT_ID or TESLA_CLIENT_SECRET not defined');
    }

    try {
      this.logger.log('🔄 Exchanging authorization code for tokens...');

      const response = await axios.post(
        'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
          audience: audience,
          redirect_uri: redirectUri
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      const { access_token, refresh_token, expires_in } = response.data;

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

      // Retrieve user profile from Tesla API
      let profile: UserProfile | undefined;
      try {
        profile = await this.fetchUserProfile(access_token);
        this.logger.log(`👤 User profile retrieved: ${profile?.email || 'N/A'}`);
      } catch (profileError) {
        this.logger.warn('⚠️ Unable to retrieve user profile, continuing anyway');
      }

      // Encrypt tokens before storing
      const encryptedAccessToken = encrypt(access_token);
      const encryptedRefreshToken = encrypt(refresh_token);

      // Check if user already exists by email
      const user = await this.userRepository.findOne({ 
        where: { email: profile?.email } 
      });

      let userId: string;

      if (user) {
        // Update existing user
        user.access_token = encryptedAccessToken;
        user.refresh_token = encryptedRefreshToken;
        user.expires_at = expiresAt;
        user.full_name = profile?.full_name;
        user.profile_image_url = profile?.profile_image_url;
        
        await this.userRepository.save(user);
        userId = user.userId;
        
        this.logger.log(`✅ User updated in database: ${userId}`);
      } else {
        // Create new user
        userId = crypto.randomBytes(16).toString('hex');
        
        const newUser = this.userRepository.create({
          userId,
          email: profile?.email,
          full_name: profile?.full_name,
          profile_image_url: profile?.profile_image_url,
          access_token: encryptedAccessToken,
          refresh_token: encryptedRefreshToken,
          expires_at: expiresAt,
        });

        await this.userRepository.save(newUser);
        
        this.logger.log(`✅ New user created in database: ${userId}`);
      }

      this.logger.log(`📅 Token expiration: ${expiresAt.toISOString()}`);

      return { userId, access_token };
    } catch (error: unknown) {
      const errorData = (error as any)?.response?.data;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Error exchanging code:', errorData || errorMessage);
      throw new UnauthorizedException('Tesla authentication failed');
    }
  }

  /**
   * Gets the access token for a user
   */
  async getAccessToken(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(`⚠️ No user found: ${userId}`);
      return null;
    }

    // Check if token has expired
    const now = new Date();
    if (now > user.expires_at) {
      this.logger.warn(`⚠️ Token expired for user: ${userId}`);
      // TODO: Implement token refresh logic here
      return null;
    }

    // Decrypt token
    try {
      return decrypt(user.access_token);
    } catch (error) {
      this.logger.error(`❌ Failed to decrypt token for user: ${userId}`);
      return null;
    }
  }

  /**
   * Checks if a user has a valid token
   */
  async hasValidToken(userId: string): Promise<boolean> {
    const token = await this.getAccessToken(userId);
    return token !== null;
  }

  /**
   * Fetches user profile from Tesla API
   */
  private async fetchUserProfile(accessToken: string): Promise<UserProfile> {
    try {
      const response = await this.teslaApi.get('/api/1/users/me', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });

      return response.data.response || response.data;
    } catch (error: unknown) {
      const errorData = (error as any)?.response?.data;
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('❌ Error retrieving profile:', errorData || errorMessage);
      throw new Error('Unable to retrieve user profile');
    }
  }

  /**
   * Gets the stored user profile
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(`⚠️ No profile found for user: ${userId}`);
      return null;
    }

    // Check if token has expired
    const now = new Date();
    if (now > user.expires_at) {
      this.logger.warn(`⚠️ Token expired for user: ${userId}`);
      return null;
    }

    return {
      email: user.email,
      full_name: user.full_name,
      profile_image_url: user.profile_image_url,
    };
  }

  /**
   * Gets token information for a user
   */
  async getTokenInfo(userId: string): Promise<{ exists: boolean; expires_at?: Date; created_at?: Date; has_profile?: boolean }> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      return { exists: false };
    }

    return {
      exists: true,
      expires_at: user.expires_at,
      created_at: user.created_at,
      has_profile: !!(user.email || user.full_name),
    };
  }

  /**
   * Get user entity by userId
   */
  async getUserById(userId: string): Promise<User | null> {
    return await this.userRepository.findOne({ where: { userId } });
  }

  /**
   * Cleans expired states
   */
  private cleanupExpiredStates(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [state, data] of this.pendingStates.entries()) {
      const elapsed = now.getTime() - data.created_at.getTime();
      if (elapsed > this.STATE_TIMEOUT_MS) {
        this.pendingStates.delete(state);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.debug(`🧹 ${cleaned} expired state(s) cleaned`);
    }
  }

  /**
   * Service statistics
   */
  async getStats(): Promise<{ activeUsers: number; pendingStates: number }> {
    const activeUsers = await this.userRepository.count();

    return {
      activeUsers,
      pendingStates: this.pendingStates.size
    };
  }
}
