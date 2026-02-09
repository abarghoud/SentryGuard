import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { And, Or, Repository, IsNull, LessThanOrEqual, MoreThan } from 'typeorm';
import axios from 'axios';
import { User } from '../../../entities/user.entity';
import { encrypt, decrypt } from '../../../common/utils/crypto.util';

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
    private readonly userRepository: Repository<User>
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
      select: ['userId'],
    });
  }

  public async refreshTokenForUser(userId: string): Promise<RefreshResult> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(`User not found: ${userId}`);
      return RefreshResult.TransientFailure;
    }

    if (user.token_revoked_at) {
      this.logger.warn(`Skipping revoked user: ${userId}`);
      return RefreshResult.AuthenticationExpired;
    }

    if (this.isRefreshTokenExpired(user)) {
      this.logger.warn(`Refresh token expired for user: ${userId}`);
      return RefreshResult.AuthenticationExpired;
    }

    const decryptedRefreshToken = this.decryptRefreshTokenSafely(user);

    if (!decryptedRefreshToken) {
      return RefreshResult.TransientFailure;
    }

    const previousUpdatedAt = user.refresh_token_updated_at;

    let teslaResponse: TeslaTokenResponse;
    try {
      teslaResponse = await this.requestTokenRefresh(decryptedRefreshToken);
    } catch (error) {
      if (this.isAuthenticationFailure(error)) {
        this.logger.warn(
          `Authentication expired for user ${userId}, invalidating tokens`
        );
        await this.invalidateUserTokens(userId);
        return RefreshResult.AuthenticationExpired;
      }

      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Transient failure refreshing token for user ${userId}: ${errorMessage}`
      );
      return RefreshResult.TransientFailure;
    }

    const isPersisted = await this.persistRefreshedTokens(
      userId,
      previousUpdatedAt,
      teslaResponse
    );

    if (!isPersisted) {
      this.logger.log(
        `Token already refreshed by another process for user: ${userId}`
      );
      return RefreshResult.AlreadyRefreshed;
    }

    this.logger.log(`Token refreshed successfully for user: ${userId}`);
    return RefreshResult.Success;
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

  private async persistRefreshedTokens(
    userId: string,
    previousUpdatedAt: Date | null | undefined,
    response: TeslaTokenResponse
  ): Promise<boolean> {
    const encryptedAccessToken = encrypt(response.access_token);
    const encryptedRefreshToken = encrypt(response.refresh_token);

    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + (response.expires_in || 3600));

    const now = new Date();
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(refreshTokenExpiresAt.getDate() + REFRESH_TOKEN_LIFETIME_DAYS);

    const queryBuilder = this.userRepository
      .createQueryBuilder()
      .update(User)
      .set({
        access_token: encryptedAccessToken,
        refresh_token: encryptedRefreshToken,
        expires_at: expiresAt,
        refresh_token_updated_at: now,
        refresh_token_expires_at: refreshTokenExpiresAt,
        token_revoked_at: () => 'NULL',
      })
      .where('userId = :userId', { userId });

    if (previousUpdatedAt) {
      queryBuilder.andWhere('refresh_token_updated_at = :previousUpdatedAt', {
        previousUpdatedAt,
      });
    } else {
      queryBuilder.andWhere('refresh_token_updated_at IS NULL');
    }

    const result = await queryBuilder.execute();

    return (result.affected ?? 0) > 0;
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

  private async invalidateUserTokens(userId: string): Promise<void> {
    await this.userRepository.update(userId, {
      token_revoked_at: new Date(),
      jwt_token: null,
      jwt_expires_at: null,
    });
  }
}
