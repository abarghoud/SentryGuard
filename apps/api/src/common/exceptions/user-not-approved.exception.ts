import { UnauthorizedException } from '@nestjs/common';

export class UserNotApprovedException extends UnauthorizedException {
  readonly code = 'USER_NOT_APPROVED';

  constructor(public readonly email: string) {
    const message = 'Your account is pending approval';
    super({
      statusCode: 401,
      message,
      error: 'USER_NOT_APPROVED',
      email,
    });

    this.message = message;
  }
}
