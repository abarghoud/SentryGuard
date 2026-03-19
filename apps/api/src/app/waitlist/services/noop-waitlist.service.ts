import { Injectable, Logger } from '@nestjs/common';
import type { WaitlistServiceRequirements } from '../interfaces/waitlist-service.requirements';

@Injectable()
export class NoopWaitlistService implements WaitlistServiceRequirements {
  private readonly logger = new Logger(NoopWaitlistService.name);

  public async isApproved(): Promise<boolean> {
    return true;
  }

  public async addToWaitlist(): Promise<void> {
    this.logger.debug('Waitlist is disabled, skipping registration');
  }
}