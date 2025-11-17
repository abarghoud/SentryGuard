import { UnauthorizedException } from '@nestjs/common';

/**
 * Exception thrown when a Tesla OAuth token has been revoked by the user
 */
export class TokenRevokedException extends UnauthorizedException {
  constructor(public readonly userId: string) {
    super({
      statusCode: 401,
      message:
        'Your Tesla authorization has been revoked. Please reconnect your account.',
      error: 'TOKEN_REVOKED',
      userId,
    });
  }
}