import { UnauthorizedException } from '@nestjs/common';

/**
 * Exception thrown when a Tesla OAuth token has been revoked by the user
 * This occurs when the user removes app access from their Tesla account settings
 *
 * This exception triggers automatic invalidation of the user's session tokens
 * and requires the user to re-authenticate with Tesla
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

    Object.setPrototypeOf(this, TokenRevokedException.prototype);
  }
}