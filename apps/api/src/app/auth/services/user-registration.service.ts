import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import { User } from '../../../entities/user.entity';
import { encrypt } from '../../../common/utils/crypto.util';
import { UserNotApprovedException } from '../../../common/exceptions/user-not-approved.exception';
import { WaitlistService } from '../../waitlist/services/waitlist.service';
import { REFRESH_TOKEN_LIFETIME_DAYS } from './tesla-token-refresh.service';
import {
  OAuthTokensResponse,
  OAuthUserProfile,
} from '../interfaces/oauth-provider.requirements';

@Injectable()
export class UserRegistrationService {
  private static readonly DEFAULT_JWT_EXPIRY_IN_DAYS = 30;

  private readonly logger = new Logger(UserRegistrationService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    private readonly waitlistService: WaitlistService
  ) {}

  async createOrUpdateUser(
    tokens: OAuthTokensResponse,
    profile: OAuthUserProfile | undefined,
    userLocale: 'en' | 'fr'
  ): Promise<string> {
    const encryptedAccessToken = encrypt(tokens.access_token);
    const encryptedRefreshToken = encrypt(tokens.refresh_token);

    const existingUser = profile?.email
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
    profile: OAuthUserProfile | undefined,
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

  private async updateExistingUser(
    user: User,
    tokens: OAuthTokensResponse,
    profile: OAuthUserProfile | undefined,
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
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS
    );
    user.refresh_token_expires_at = refreshTokenExpiresAt;

    await this.userRepository.save(user);

    this.logger.log(`User updated in database: ${userId}`);
    this.logger.log(
      `JWT token generated, expires at: ${jwtData.expiresAt.toISOString()}`
    );

    return userId;
  }

  private async createNewUser(
    tokens: OAuthTokensResponse,
    profile: OAuthUserProfile | undefined,
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
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS
    );

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

    this.logger.log(
      `New user created in database: ${userId} with locale: ${userLocale}`
    );
    this.logger.log(
      `JWT token generated, expires at: ${jwtData.expiresAt.toISOString()}`
    );

    return userId;
  }

  private async generateJwtToken(
    userId: string,
    email: string
  ): Promise<{ token: string; expiresAt: Date }> {
    const payload = {
      sub: userId,
      email: email,
    };

    const token = await this.jwtService.signAsync(payload);

    const expiresIn = process.env.JWT_EXPIRATION || '30d';
    const expiresAt = new Date();

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
      expiresAt.setDate(expiresAt.getDate() + UserRegistrationService.DEFAULT_JWT_EXPIRY_IN_DAYS);
    }

    return { token, expiresAt };
  }
}
