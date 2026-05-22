import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import { User } from '../../entities/user.entity';
import { MissingPermissionsException } from '../../common/exceptions/missing-permissions.exception';
import { UserNotApprovedException } from '../../common/exceptions/user-not-approved.exception';
import type { OAuthProviderRequirements } from './interfaces/oauth-provider.requirements';
import { oauthProviderRequirementsSymbol } from './interfaces/oauth-provider.requirements';
import { UserRegistrationService } from './services/user-registration.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @Inject(oauthProviderRequirementsSymbol)
    private readonly oauthProvider: OAuthProviderRequirements,
    private readonly userRegistrationService: UserRegistrationService
  ) {}

  async exchangeCodeForTokens(
    code: string,
    state: string
  ): Promise<{ jwt: string; mobileRedirectUri?: string; userId: string }> {
    try {
      const { tokens, profile, userLocale, mobileRedirectUri } =
        await this.oauthProvider.authenticateWithCode(code, state);
      const userId =
        await this.userRegistrationService.createOrUpdateUser(
          tokens,
          profile,
          userLocale
        );

      const savedUser = await this.userRepository.findOne({
        where: { userId },
      });
      const jwt = savedUser?.jwt_token || '';

      return { jwt, mobileRedirectUri, userId };
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
      this.logger.error(
        'Error exchanging code:',
        errorData || errorMessage
      );

      throw new UnauthorizedException('Tesla authentication failed');
    }
  }

  async validateJwtToken(jwt: string): Promise<User | null> {
    try {
      const payload = await this.jwtService.verifyAsync(jwt);
      const user = await this.userRepository.findOne({
        where: { userId: payload.sub },
      });

      if (!user || user.jwt_token !== jwt) {
        this.logger.warn(`Invalid JWT token`);
        return null;
      }

      const now = new Date();
      if (user.jwt_expires_at && now > user.jwt_expires_at) {
        this.logger.warn(`JWT expired for user: ${user.userId}`);
        return null;
      }

      return user;
    } catch (error) {
      if (!(error instanceof TokenExpiredError)) {
        this.logger.error(`Failed to validate JWT token:`, error);
      }

      return null;
    }
  }

  async getRefreshableJwtUser(jwt: string): Promise<User | null> {
    try {
      const payload = await this.jwtService.verifyAsync(jwt, { ignoreExpiration: true });
      const user = await this.userRepository.findOne({ where: { userId: payload.sub } });

      if (!user || user.jwt_token !== jwt || !this.hasRefreshableSession(user)) {
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to read refreshable JWT token:`, error);
      return null;
    }
  }

  async refreshJwtSession(userId: string): Promise<{ jwt: string; jwt_expires_at: Date } | null> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user || !this.hasRefreshableSession(user)) {
      return null;
    }

    const jwtData = await this.generateJwtToken(user.userId, user.email || '');
    user.jwt_token = jwtData.token;
    user.jwt_expires_at = jwtData.expiresAt;
    user.token_revoked_at = null;
    await this.userRepository.save(user);

    return { jwt: jwtData.token, jwt_expires_at: jwtData.expiresAt };
  }

  async revokeJwtToken(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (user) {
      user.jwt_token = undefined;
      user.jwt_expires_at = undefined;
      await this.userRepository.save(user);
      this.logger.log(`JWT token revoked for user: ${userId}`);
    }
  }

  async invalidateUserTokens(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(
        `Cannot invalidate tokens: user not found: ${userId}`
      );
      return;
    }

    user.jwt_token = null;
    user.jwt_expires_at = null;
    user.token_revoked_at = new Date();

    await this.userRepository.save(user);

    this.logger.warn(
      `All tokens invalidated for user ${userId} due to Tesla token revocation`
    );
  }

  private hasRefreshableSession(user: User): boolean {
    if (user.token_revoked_at || !user.refresh_token) {
      return false;
    }

    return !user.refresh_token_expires_at || new Date() < user.refresh_token_expires_at;
  }

  private async generateJwtToken(userId: string, email: string): Promise<{ token: string; expiresAt: Date }> {
    const token = await this.jwtService.signAsync({ sub: userId, email });
    return { token, expiresAt: this.resolveJwtExpiresAt() };
  }

  private resolveJwtExpiresAt(): Date {
    const expiresAt = new Date();
    const match = (process.env.JWT_EXPIRATION || '30d').match(/^(\d+)([dhm])$/);

    if (!match) {
      expiresAt.setDate(expiresAt.getDate() + 30);
      return expiresAt;
    }

    this.applyJwtExpiry(expiresAt, parseInt(match[1], 10), match[2]);
    return expiresAt;
  }

  private applyJwtExpiry(expiresAt: Date, value: number, unit: string): void {
    if (unit === 'd') expiresAt.setDate(expiresAt.getDate() + value);
    if (unit === 'h') expiresAt.setHours(expiresAt.getHours() + value);
    if (unit === 'm') expiresAt.setMinutes(expiresAt.getMinutes() + value);
  }
}
