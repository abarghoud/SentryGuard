import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import * as crypto from 'crypto';
import { UserSession } from '../../../entities/user-session.entity';

@Injectable()
export class UserSessionService {
  private static readonly MAX_ACTIVE_SESSIONS_PER_USER = 5;
  private readonly logger = new Logger(UserSessionService.name);

  constructor(
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>
  ) {}

  public async createSession(
    userId: string,
    token: string,
    expiresAt: Date
  ): Promise<UserSession> {
    return this.userSessionRepository.save(
      this.userSessionRepository.create({
        userId,
        jwt_hash: this.hashJwt(token),
        expires_at: expiresAt,
        last_used_at: new Date(),
      })
    );
  }

  public async findSession(token: string): Promise<UserSession | null> {
    return this.userSessionRepository.findOne({
      relations: { user: true },
      where: { jwt_hash: this.hashJwt(token) },
    });
  }

  public async validateSession(token: string): Promise<UserSession | null> {
    const session = await this.findSession(token);

    if (
      !session ||
      session.revoked_at ||
      session.user.token_revoked_at ||
      new Date() > session.expires_at
    ) {
      return null;
    }

    return session;
  }

  public async touchSession(session: UserSession): Promise<void> {
    session.last_used_at = new Date();
    await this.userSessionRepository.save(session);
  }

  public async revokeSession(userId: string, token: string): Promise<void> {
    const session = await this.findSession(token);

    if (session?.userId === userId && !session.revoked_at) {
      session.revoked_at = new Date();
      await this.userSessionRepository.save(session);
      this.logger.log(`JWT session revoked for user: ${userId}`);
    }
  }

  public async revokeAllSessions(userId: string): Promise<void> {
    await this.userSessionRepository
      .createQueryBuilder()
      .update(UserSession)
      .set({ revoked_at: new Date() })
      .where('"userId" = :userId', { userId })
      .andWhere('"revoked_at" IS NULL')
      .execute();
  }

  public async enforceSessionLimits(userId: string): Promise<void> {
    const activeSessions = await this.userSessionRepository.find({
      order: { created_at: 'DESC' },
      select: { id: true },
      where: { userId, revoked_at: IsNull() },
    });
    const sessionsToRevoke = activeSessions.slice(
      UserSessionService.MAX_ACTIVE_SESSIONS_PER_USER
    );

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

  public async updateSession(session: UserSession): Promise<UserSession> {
    return this.userSessionRepository.save(session);
  }

  public hashJwt(jwt: string): string {
    return crypto.createHash('sha256').update(jwt).digest('hex');
  }
}
