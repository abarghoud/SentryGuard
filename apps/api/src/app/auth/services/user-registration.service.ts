import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import { User } from '../../../entities/user.entity';
import { encrypt } from '../../../common/utils/crypto.util';
import { UserNotApprovedException } from '../../../common/exceptions/user-not-approved.exception';
import type { WaitlistServiceRequirements } from '../../waitlist/interfaces/waitlist-service.requirements';
import { waitlistServiceRequirementsSymbol } from '../../waitlist/interfaces/waitlist-service.requirements';
import { REFRESH_TOKEN_LIFETIME_DAYS } from './tesla-token-refresh.service';
import {
  OAuthTokensResponse,
  OAuthUserProfile,
} from '../interfaces/oauth-provider.requirements';

@Injectable()
export class UserRegistrationService {
  private readonly logger = new Logger(UserRegistrationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @Inject(waitlistServiceRequirementsSymbol)
    private readonly waitlistService: WaitlistServiceRequirements
  ) {}

  async createOrUpdateUser(
    tokens: OAuthTokensResponse,
    profile: OAuthUserProfile,
    userLocale: 'en' | 'fr'
  ): Promise<string> {
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    const existingUser = profile.email
      ? await this.userRepository.findOne({
          where: { email: profile.email },
        })
      : null;

    if (existingUser) {
      return this.updateExistingUser(
        existingUser,
        tokens,
        profile,
        encryptedAccessToken,
        encryptedRefreshToken
      );
    }

    await this.verifyWaitlistApproval(profile, userLocale);

    return this.createNewUser(
      tokens,
      profile,
      encryptedAccessToken,
      encryptedRefreshToken,
      userLocale
    );
  }

  private async verifyWaitlistApproval(
    profile: OAuthUserProfile,
    userLocale: 'en' | 'fr'
  ): Promise<void> {
    if (!profile.email) {
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

  private async updateExistingUser(
    user: User,
    tokens: OAuthTokensResponse,
    profile: OAuthUserProfile,
    encryptedAccessToken: string,
    encryptedRefreshToken: string
  ): Promise<string> {
    user.access_token = encryptedAccessToken;
    user.refresh_token = encryptedRefreshToken;
    user.expires_at = tokens.expiresAt;
    user.full_name = profile?.full_name;

    const userId = user.userId;
    user.token_revoked_at = null;

    const now = new Date();
    user.refresh_token_updated_at = now;
    const refreshTokenExpiresAt = new Date(now);
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS
    );
    user.refresh_token_expires_at = refreshTokenExpiresAt;

    await this.userRepository.save(user);

    this.logger.log(`User updated in database: ${userId}`);

    return userId;
  }

  private async createNewUser(
    tokens: OAuthTokensResponse,
    profile: OAuthUserProfile,
    encryptedAccessToken: string,
    encryptedRefreshToken: string,
    userLocale: 'en' | 'fr'
  ): Promise<string> {
    const userId = crypto.randomBytes(16).toString('hex');

    const now = new Date();
    const refreshTokenExpiresAt = new Date(now);
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS
    );

    const newUser = this.userRepository.create({
      userId,
      email: profile?.email,
      full_name: profile?.full_name,
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: tokens.expiresAt,
      preferred_language: userLocale,
      token_revoked_at: null,
      refresh_token_updated_at: now,
      refresh_token_expires_at: refreshTokenExpiresAt,
    });

    await this.userRepository.save(newUser);

    this.logger.log(
      `New user created in database: ${userId} with locale: ${userLocale}`
    );

    return userId;
  }
}
