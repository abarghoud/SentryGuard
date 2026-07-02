import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, Or, Repository, IsNull, LessThanOrEqual, MoreThan, DataSource, EntityManager } from 'typeorm';
import axios from 'axios';
import { User } from '../../../entities/user.entity';
import { UserSession } from '../../../entities/user-session.entity';
import { encrypt, decrypt } from '../../../common/utils/crypto.util';
import { MailingService } from '../../mailing/services/mailing.service';

export const REFRESH_TOKEN_LIFETIME_DAYS = 90;

const REFRESH_TOKEN_EXPIRATION_BUFFER_DAYS = 7;

export enum RefreshResult {
  Success = 'Success',
  AlreadyRefreshed = 'AlreadyRefreshed',
  AuthenticationExpired = 'AuthenticationExpired',
  TransientFailure = 'TransientFailure',
}

interface TeslaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

@Injectable()
export class TeslaTokenRefreshService {
  private readonly logger = new Logger(TeslaTokenRefreshService.name);

  private static readonly TESLA_TOKEN_ENDPOINT =
    'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token';

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly mailingService: MailingService
  ) {}

  public async findUsersWithExpiringRefreshTokens(): Promise<Pick<User, 'userId'>[]> {
    const now = new Date();
    const bufferDate = new Date();
    bufferDate.setDate(bufferDate.getDate() + REFRESH_TOKEN_EXPIRATION_BUFFER_DAYS);

    const expiringWithinBuffer = And(MoreThan(now), LessThanOrEqual(bufferDate));
    const notYetSet = IsNull();

    return this.userRepository.find({
      where: {
        refresh_token_expires_at: Or(expiringWithinBuffer, notYetSet),
        token_revoked_at: IsNull(),
      },
      select: {
        userId: true
      },
    });
  }

  public async refreshTokenForUser(userId: string): Promise<RefreshResult> {
    try {
      return await this.dataSource.transaction(async (manager) => {
        const user = await manager.findOne(User, {
          where: { userId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!user) {
          this.logger.warn(`User not found: ${userId}`);
          return RefreshResult.TransientFailure;
        }

        const validationResult = this.validateUserForRefresh(user);
        if (validationResult !== RefreshResult.Success) {
          return validationResult;
        }

        const decryptedRefreshToken = this.decryptRefreshTokenSafely(user);
        if (!decryptedRefreshToken) {
          return RefreshResult.TransientFailure;
        }

        return await this.executeRefreshWithTesla(manager, userId, decryptedRefreshToken);
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to refresh token in transaction for user ${userId}: ${errorMessage}`);
      return RefreshResult.TransientFailure;
    }
  }

  private validateUserForRefresh(user: User): RefreshResult {
    if (user.token_revoked_at) {
      this.logger.warn(`Skipping revoked user: ${user.userId}`);
      return RefreshResult.AuthenticationExpired;
    }

    if (this.isRefreshTokenExpired(user)) {
      this.logger.warn(`Refresh token expired for user: ${user.userId}`);
      return RefreshResult.AuthenticationExpired;
    }

    if (user.expires_at && new Date() < user.expires_at) {
      this.logger.debug(`Token already refreshed by another request for user: ${user.userId}`);
      return RefreshResult.AlreadyRefreshed;
    }

    return RefreshResult.Success;
  }

  private async executeRefreshWithTesla(
    manager: EntityManager,
    userId: string,
    decryptedRefreshToken: string
  ): Promise<RefreshResult> {
    try {
      const teslaResponse = await this.requestTokenRefresh(decryptedRefreshToken);
      await this.persistRefreshedTokens(manager, userId, teslaResponse);

      this.logger.log(`Token refreshed successfully for user: ${userId}`);
      return RefreshResult.Success;
    } catch (error) {
      return this.handleTokenRefreshFailure(manager, userId, error);
    }
  }

  private async handleTokenRefreshFailure(
    manager: EntityManager,
    userId: string,
    error: unknown
  ): Promise<RefreshResult> {
    if (this.isAuthenticationFailure(error)) {
      this.logger.warn(`Authentication expired for user ${userId}, invalidating tokens`);
      await this.invalidateUserTokens(manager, userId);
      return RefreshResult.AuthenticationExpired;
    }

    const errorMessage = error instanceof Error ? error.message : String(error);
    this.logger.error(`Transient failure refreshing token for user ${userId}: ${errorMessage}`);
    return RefreshResult.TransientFailure;
  }

  private async persistRefreshedTokens(
    manager: EntityManager,
    userId: string,
    response: TeslaTokenResponse
  ): Promise<void> {
    const encryptedAccessToken = encrypt(response.access_token);
    const encryptedRefreshToken = encrypt(response.refresh_token);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (response.expires_in || 3600));

    const now = new Date();
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS);

    await manager.update(User, { userId }, {
      access_token: encryptedAccessToken,
      refresh_token: encryptedRefreshToken,
      expires_at: expiresAt,
      refresh_token_updated_at: now,
      refresh_token_expires_at: refreshTokenExpiresAt,
      token_revoked_at: null as unknown as Date,
    });
  }

  private async invalidateUserTokens(manager: EntityManager, userId: string): Promise<void> {
    const user = await manager.findOne(User, {
      where: { userId },
      select: { email: true, full_name: true, preferred_language: true },
    });

    await manager.update(User, { userId }, {
      token_revoked_at: new Date(),
    });
    await manager.update(UserSession, { userId, revoked_at: IsNull() }, {
      revoked_at: new Date(),
    });

    if (user?.email) {
      await this.mailingService.sendTeslaDisconnectedEmail(user.email, user.preferred_language, {
        name: user.full_name || '',
      }).catch((error) => {
        this.logger.error(`Failed to send token revoked email to ${user.email}: ${error.message}`);
      });
    }
  }

  private async requestTokenRefresh(
    decryptedRefreshToken: string
  ): Promise<TeslaTokenResponse> {
    const clientId = process.env.TESLA_CLIENT_ID;

    if (!clientId) {
      throw new Error('TESLA_CLIENT_ID not defined');
    }

    const response = await axios.post(
      TeslaTokenRefreshService.TESLA_TOKEN_ENDPOINT,
      new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: clientId,
        refresh_token: decryptedRefreshToken,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    return response.data;
  }

  private isAuthenticationFailure(error: unknown): boolean {
    const axiosError = error as any;
    const status = axiosError?.response?.status;
    const errorCode = axiosError?.response?.data?.error;

    if (status === 401) {
      return true;
    }

    return status === 400 && errorCode === 'invalid_grant';
  }

  private isRefreshTokenExpired(user: User): boolean {
    if (!user.refresh_token_expires_at) {
      return false;
    }

    return new Date() > user.refresh_token_expires_at;
  }

  private decryptRefreshTokenSafely(user: User): string | null {
    try {
      return decrypt(user.refresh_token);
    } catch (error) {
      this.logger.error(
        `Failed to decrypt refresh token for user: ${user.userId}`
      );
      return null;
    }
  }
}
