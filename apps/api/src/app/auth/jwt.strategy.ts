import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../entities/user.entity';
import { UserSessionService } from './services/user-session.service';

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
    private readonly userSessionService: UserSessionService,
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

  public async validate(request: JwtRequest, payload: JwtPayload): Promise<User> {
    const token = this.extractBearerToken(request);
    if (!token) {
      throw new UnauthorizedException('User not found');
    }

    const session = await this.userSessionService.findSession(token);
    if (!session?.user) {
      throw new UnauthorizedException('User not found');
    }

    const validatedSession = await this.userSessionService.validateSession(token);
    if (!validatedSession || session.user.userId !== payload.sub) {
      throw new UnauthorizedException('Token expired or invalid');
    }

    return session.user;
  }

  private extractBearerToken(request: JwtRequest): string | null {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    return authorization.slice('Bearer '.length);
  }
}
