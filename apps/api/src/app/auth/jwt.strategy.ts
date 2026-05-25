import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import * as crypto from 'crypto';

export interface JwtPayload {
  sub: string;
  email: string;
  iat?: number;
  exp?: number;
}

interface JwtRequest {
  headers: {
    authorization?: string;
  };
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(UserSession)
    private readonly userSessionRepository: Repository<UserSession>,
  ) {
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error('JWT_SECRET environment variable is required');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: jwtSecret,
    });
  }

  async validate(request: JwtRequest, payload: JwtPayload): Promise<User> {
    const session = await this.userSessionRepository.findOne({
      relations: { user: true },
      where: { jwt_hash: this.hashJwt(this.extractBearerToken(request) || '') },
    });
    const user = session?.user;

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.userId !== payload.sub || this.isInvalidToken(session)) {
      throw new UnauthorizedException('Token expired or invalid');
    }

    return user;
  }

  private isInvalidToken(session: UserSession): boolean {
    return !!session.revoked_at || !!session.user.token_revoked_at || this.isExpired(session);
  }

  private extractBearerToken(request: JwtRequest): string | null {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    return authorization.slice('Bearer '.length);
  }

  private isExpired(session: UserSession): boolean {
    return new Date() > session.expires_at;
  }

  private hashJwt(jwt: string): string {
    return crypto.createHash('sha256').update(jwt).digest('hex');
  }
}
