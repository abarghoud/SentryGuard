import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConsentService } from '../../app/consent/consent.service';

@Injectable()
export class ConsentGuard implements CanActivate {
  private readonly logger = new Logger(ConsentGuard.name);

  constructor(private readonly consentService: ConsentService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.userId) {
      this.logger.warn('ConsentGuard: No user found in request');
      throw new ForbiddenException('Authentication required');
    }

    try {
      const consentStatus = await this.consentService.getCurrentConsent(user.userId);

      if (!consentStatus.hasConsent) {
        this.logger.warn(`ConsentGuard: User ${user.userId} has no valid consent`);
        throw new ForbiddenException(
          'Consent required. Please accept the consent terms to access this feature.'
        );
      }

      request.consentStatus = consentStatus;

      return true;
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.error(`ConsentGuard: Error checking consent for user ${user.userId}`, error);
      throw new ForbiddenException('Unable to verify consent status');
    }
  }
}
