import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

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
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
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
    const user = await this.userRepository.findOne({
      where: { userId: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (this.isInvalidToken(user, request)) {
      throw new UnauthorizedException('Token expired or invalid');
    }

    return user;
  }

  private isInvalidToken(user: User, request: JwtRequest): boolean {
    return !user.jwt_token || user.jwt_token !== this.extractBearerToken(request) || this.isExpired(user);
  }

  private extractBearerToken(request: JwtRequest): string | null {
    const authorization = request.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
      return null;
    }

    return authorization.slice('Bearer '.length);
  }

  private isExpired(user: User): boolean {
    return !!user.jwt_expires_at && new Date() > user.jwt_expires_at;
  }
}
