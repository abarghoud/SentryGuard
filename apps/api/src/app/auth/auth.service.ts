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
import { UserSession } from '../../entities/user-session.entity';
import { MissingPermissionsException } from '../../common/exceptions/missing-permissions.exception';
import { UserNotApprovedException } from '../../common/exceptions/user-not-approved.exception';
import type { OAuthProviderRequirements } from './interfaces/oauth-provider.requirements';
import { oauthProviderRequirementsSymbol } from './interfaces/oauth-provider.requirements';
import { UserRegistrationService } from './services/user-registration.service';
import { UserSessionService } from './services/user-session.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
    @Inject(oauthProviderRequirementsSymbol)
    private readonly oauthProvider: OAuthProviderRequirements,
    private readonly userRegistrationService: UserRegistrationService,
    private readonly userSessionService: UserSessionService
  ) {}

  public async exchangeCodeForTokens(
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

      const user = await this.userRepository.findOne({
        where: { userId },
      });
      const jwtData = await this.generateJwtToken(userId, user?.email || '');
      await this.userSessionService.createSession(userId, jwtData.token, jwtData.expiresAt);
      await this.userSessionService.enforceSessionLimits(userId);

      return { jwt: jwtData.token, mobileRedirectUri, userId };
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

  public async validateJwtToken(jwt: string): Promise<User | null> {
    try {
      await this.jwtService.verifyAsync(jwt);
      const session = await this.userSessionService.validateSession(jwt);
      const user = session?.user;

      if (!user) {
        this.logger.warn(`Invalid JWT token`);
        return null;
      }

      await this.userSessionService.touchSession(session);
      return user;
    } catch (error) {
      if (!(error instanceof TokenExpiredError)) {
        this.logger.error(`Failed to validate JWT token:`, error);
      }

      return null;
    }
  }

  public async getRefreshableJwtUser(jwt: string): Promise<User | null> {
    try {
      await this.jwtService.verifyAsync(jwt, { ignoreExpiration: true });
      const session = await this.userSessionService.findSession(jwt);
      const user = session?.user;

      if (!session || !user || session.revoked_at || !this.hasRefreshableSession(user)) {
        return null;
      }

      return user;
    } catch (error) {
      this.logger.error(`Failed to read refreshable JWT token:`, error);
      return null;
    }
  }

  public async refreshJwtSession(userId: string, jwt: string): Promise<{ jwt: string; jwt_expires_at: Date } | null> {
    const user = await this.userRepository.findOne({ where: { userId } });
    const session = await this.userSessionService.findSession(jwt);

    if (!user || !session || session.userId !== userId || session.revoked_at || !this.hasRefreshableSession(user)) {
      return null;
    }

    const jwtData = await this.generateJwtToken(user.userId, user.email || '');
    user.token_revoked_at = null;
    session.jwt_hash = this.userSessionService.hashJwt(jwtData.token);
    session.expires_at = jwtData.expiresAt;
    session.last_used_at = new Date();
    await this.userRepository.save(user);
    await this.userSessionService.updateSession(session);

    return { jwt: jwtData.token, jwt_expires_at: jwtData.expiresAt };
  }

  public async getActiveJwtSession(jwt: string): Promise<UserSession | null> {
    return this.userSessionService.validateSession(jwt);
  }

  public async revokeJwtToken(userId: string, jwt?: string): Promise<void> {
    if (jwt) {
      await this.userSessionService.revokeSession(userId, jwt);
      return;
    }

    await this.userSessionService.revokeAllSessions(userId);
  }

  public async invalidateUserTokens(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { userId } });

    if (!user) {
      this.logger.warn(
        `Cannot invalidate tokens: user not found: ${userId}`
      );
      return;
    }

    user.token_revoked_at = new Date();

    await this.userRepository.save(user);
    await this.userSessionService.revokeAllSessions(userId);

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
