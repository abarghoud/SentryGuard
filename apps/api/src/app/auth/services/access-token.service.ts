import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../entities/user.entity';
import { decrypt } from '../../../common/utils/crypto.util';
import {
  TeslaTokenRefreshService,
  RefreshResult,
} from './tesla-token-refresh.service';

@Injectable()
export class AccessTokenService {
  private readonly logger = new Logger(AccessTokenService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly teslaTokenRefreshService: TeslaTokenRefreshService
  ) {}

  async getAccessTokenForUserId(userId: string): Promise<string | null> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(`No user found: ${userId}`);
      return null;
    }

    const now = new Date();
    if (now > user.expires_at) {
      this.logger.warn(`Tesla token expired for user: ${userId}`);

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
    } catch {
      this.logger.error(`Failed to decrypt token for user: ${user.userId}`);
      return null;
    }
  }
}