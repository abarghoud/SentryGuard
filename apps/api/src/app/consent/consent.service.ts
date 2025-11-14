import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserConsent } from '../../entities/user-consent.entity';
import { User } from '../../entities/user.entity';
import * as crypto from 'crypto';

export interface ConsentData {
  version: string;
  textHash: string;
  locale: string;
  ipAddress: string;
  userAgent: string;
  appTitle: string;
  partnerName: string;
  vehiclesSnapshot?: string[];
}

export interface ConsentStatus {
  hasConsent: boolean;
  latestConsent?: UserConsent;
  isRevoked: boolean;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    @InjectRepository(UserConsent)
    private readonly consentRepository: Repository<UserConsent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async acceptConsent(userId: string, consentData: ConsentData): Promise<UserConsent> {
    this.logger.log(`User ${userId} accepting consent version ${consentData.version}`);

    // Check if user exists
    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Revoke any existing active consents for this user
    await this.consentRepository.update(
      { userId, revokedAt: null },
      { revokedAt: new Date() }
    );

    // Create new consent
    const consent = this.consentRepository.create({
      userId,
      ...consentData,
      acceptedAt: new Date(),
    });

    return await this.consentRepository.save(consent);
  }

  async getCurrentConsent(userId: string): Promise<ConsentStatus> {
    const latestConsent = await this.consentRepository.findOne({
      where: { userId },
      order: { acceptedAt: 'DESC' },
    });

    if (!latestConsent) {
      return { hasConsent: false, isRevoked: false };
    }

    const hasConsent = !latestConsent.revokedAt;
    return {
      hasConsent,
      latestConsent: hasConsent ? latestConsent : undefined,
      isRevoked: !!latestConsent.revokedAt,
    };
  }

  async revokeConsent(userId: string): Promise<void> {
    this.logger.log(`User ${userId} revoking consent`);

    const latestConsent = await this.consentRepository.findOne({
      where: { userId, revokedAt: null },
      order: { acceptedAt: 'DESC' },
    });

    if (!latestConsent) {
      throw new BadRequestException('No active consent found to revoke');
    }

    await this.consentRepository.update(
      { id: latestConsent.id },
      { revokedAt: new Date() }
    );
  }

  async getConsentHistory(userId: string): Promise<UserConsent[]> {
    return await this.consentRepository.find({
      where: { userId },
      order: { acceptedAt: 'DESC' },
    });
  }

  async exportConsents(): Promise<UserConsent[]> {
    // Admin endpoint - return all consents for audit
    return await this.consentRepository.find({
      relations: ['user'],
      order: { acceptedAt: 'DESC' },
    });
  }

  generateTextHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }

  validateConsentText(text: string, expectedHash: string): boolean {
    const computedHash = this.generateTextHash(text);
    return computedHash === expectedHash;
  }
}
