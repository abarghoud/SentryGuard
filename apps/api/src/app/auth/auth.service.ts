import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { TokenExpiredError } from 'jsonwebtoken';
import * as crypto from 'crypto';
import { User } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import { MissingPermissionsException } from '../../common/exceptions/missing-permissions.exception';
import { UserNotApprovedException } from '../../common/exceptions/user-not-approved.exception';
import type { OAuthProviderRequirements } from './interfaces/oauth-provider.requirements';
import { oauthProviderRequirementsSymbol } from './interfaces/oauth-provider.requirements';
import { UserRegistrationService } from './services/user-registration.service';

@Injectable()
export class AuthService {
  private static readonly MAX_ACTIVE_SESSIONS_PER_USER = 5;

  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
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

      const user = await this.userRepository.findOne({
        where: { userId },
      });
      const jwtData = await this.generateJwtToken(userId, user?.email || '');
      await this.createJwtSession(userId, jwtData);
      await this.revokeOldestSessionsOverLimit(userId);

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

  async validateJwtToken(jwt: string): Promise<User | null> {
    try {
      await this.jwtService.verifyAsync(jwt);
      const session = await this.findActiveSession(jwt);
      const user = session?.user;

      if (!user) {
        this.logger.warn(`Invalid JWT token`);
        return null;
      }

      if (session.expires_at && new Date() > session.expires_at) {
        this.logger.warn(`JWT expired for user: ${user.userId}`);
        return null;
      }

      await this.touchSession(session);
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
      await this.jwtService.verifyAsync(jwt, { ignoreExpiration: true });
      const session = await this.findSession(jwt);
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

  async refreshJwtSession(userId: string, jwt: string): Promise<{ jwt: string; jwt_expires_at: Date } | null> {
    const user = await this.userRepository.findOne({ where: { userId } });
    const session = await this.findSession(jwt);

    if (!user || !session || session.userId !== userId || session.revoked_at || !this.hasRefreshableSession(user)) {
      return null;
    }

    const jwtData = await this.generateJwtToken(user.userId, user.email || '');
    user.token_revoked_at = null;
    session.jwt_hash = this.hashJwt(jwtData.token);
    session.expires_at = jwtData.expiresAt;
    session.last_used_at = new Date();
    await this.userRepository.save(user);
    await this.userSessionRepository.save(session);

    return { jwt: jwtData.token, jwt_expires_at: jwtData.expiresAt };
  }

  async getActiveJwtSession(jwt: string): Promise<UserSession | null> {
    return this.findActiveSession(jwt);
  }

  async revokeJwtToken(userId: string, jwt?: string): Promise<void> {
    if (jwt) {
      const session = await this.findSession(jwt);

      if (session?.userId === userId && !session.revoked_at) {
        session.revoked_at = new Date();
        await this.userSessionRepository.save(session);
        this.logger.log(`JWT session revoked for user: ${userId}`);
      }

      return;
    }

    await this.revokeAllJwtSessions(userId);
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
    await this.revokeAllJwtSessions(userId);

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

  private async createJwtSession(
    userId: string,
    jwtData: { token: string; expiresAt: Date }
  ): Promise<void> {
    await this.userSessionRepository.save(
      this.userSessionRepository.create({
        userId,
        jwt_hash: this.hashJwt(jwtData.token),
        expires_at: jwtData.expiresAt,
        last_used_at: new Date(),
      })
    );
  }

  private async findActiveSession(jwt: string): Promise<UserSession | null> {
    const session = await this.findSession(jwt);

    if (!session || session.revoked_at || session.user.token_revoked_at || new Date() > session.expires_at) {
      return null;
    }

    return session;
  }

  private async findSession(jwt: string): Promise<UserSession | null> {
    return this.userSessionRepository.findOne({
      relations: { user: true },
      where: { jwt_hash: this.hashJwt(jwt) },
    });
  }

  private async revokeAllJwtSessions(userId: string): Promise<void> {
    await this.userSessionRepository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revoked_at: new Date() })
      .where('"userId" = :userId', { userId })
      .andWhere('"revoked_at" IS NULL')
      .execute();
  }

  private async revokeOldestSessionsOverLimit(userId: string): Promise<void> {
    const activeSessions = await this.userSessionRepository.find({
      order: { created_at: 'DESC' },
      select: { id: true },
      where: { userId, revoked_at: IsNull() },
    });
    const sessionsToRevoke = activeSessions.slice(AuthService.MAX_ACTIVE_SESSIONS_PER_USER);

    if (sessionsToRevoke.length === 0) {
      return;
    }

    await this.userSessionRepository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revoked_at: new Date() })
      .whereInIds(sessionsToRevoke.map((session) => session.id))
      .execute();
  }

  private async touchSession(session: UserSession): Promise<void> {
    session.last_used_at = new Date();
    await this.userSessionRepository.save(session);
  }

  private hashJwt(jwt: string): string {
    return crypto.createHash('sha256').update(jwt).digest('hex');
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
