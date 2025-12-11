import { UnauthorizedException } from '@nestjs/common';

export class MissingPermissionsException extends UnauthorizedException {
  readonly code = 'MISSING_PERMISSIONS';

  constructor(public readonly missingScopes: string[]) {
    const message = `Missing required permissions: ${missingScopes.join(', ')}`;
    super({
      statusCode: 401,
      message,
      error: 'MISSING_PERMISSIONS',
      missingScopes,
    });
    
    this.message = message;
  }
}
