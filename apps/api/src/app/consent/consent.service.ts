import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UserConsent } from '../../entities/user-consent.entity';
import { User } from '../../entities/user.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import type { ConsentRevokedHandler } from './interfaces/consent-revoked-handler.interface';
import { ConsentRevokedHandlerSymbol } from './interfaces/consent-revoked-handler.interface';
import * as crypto from 'crypto';
import i18n from '../../i18n';

export interface ConsentData {
  version: string;
  locale: string;
  userAgent: string;
  appTitle: string;
  partnerName: string;
}

export interface ConsentStatus {
  hasConsent: boolean;
  latestConsent?: UserConsent;
  isRevoked: boolean;
}

export interface ConsentTextResponse {
  version: string;
  locale: string;
  text: string;
  textHash: string;
  partnerName: string;
  appTitle: string;
}

@Injectable()
export class ConsentService {
  private readonly logger = new Logger(ConsentService.name);

  constructor(
    @InjectRepository(UserConsent)
    private readonly consentRepository: Repository<UserConsent>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>,
    @Inject(ConsentRevokedHandlerSymbol)
    private readonly consentRevokedHandler: ConsentRevokedHandler,
  ) {}

  async acceptConsent(userId: string, consentData: ConsentData): Promise<UserConsent> {
    this.logger.log(`User ${userId} accepting consent version ${consentData.version}`);

    const user = await this.userRepository.findOne({ where: { userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const consentText = this.createCanonicalConsentText(consentData);
    const textHash = this.generateTextHash(consentText);

    await this.consentRepository.update(
      { userId, revokedAt: IsNull() },
      { revokedAt: new Date() }
    );

    const consent = this.consentRepository.create({
      userId,
      ...consentData,
      textHash,
      acceptedAt: new Date(),
    });

    return await this.consentRepository.save(consent);
  }

  getConsentText(version: string, locale: string): ConsentTextResponse {
    const normalizedLocale = locale || 'en';
    const t = (key: string) => i18n.t(key, { lng: normalizedLocale, ns: 'common' });

    const partnerName = 'SentryGuardOrg';
    const appTitle = 'SentryGuard';
    const teslaPrivacyUrl = 'https://www.tesla.com/legal/privacy';

    const paragraphs = [
      t('By signing or accepting this form, you consent to the processing of your Personal Data by SentryGuardOrg ("Partner") in the context of the Partner\'s application titled: SentryGuard (the "App").'),
      t('Partner is the data controller responsible for the processing of your Personal Data in the context of the App.'),
      `${t('By signing or accepting this form, you also acknowledge receipt of the Tesla Customer Privacy Notice available at')} ${teslaPrivacyUrl} ${t('("Tesla Privacy Notice") and consent to processing of Personal Data by Tesla in accordance with the Tesla Privacy Notice.')}`,
      t('The App allows you to benefit from advanced monitoring and notification features based on your Tesla vehicle\'s Sentry Mode, including the identification and logging of security events (e.g., event detection, Sentry Mode alerts).'),
      t('To provide these features, Partner must process some of your Personal Data, which may include: profile information (account identifier, display name or email address, necessary to associate events with your account); minimal vehicle information necessary for the App to function, including vehicle identifier (VIN or equivalent), Sentry Mode status (activation, detected events) and metadata associated with Sentry Mode events (date/time, event type).'),
      t('Partner does not access or process other categories of data from your vehicle (e.g., remote commands, detailed driving data, battery or precise location information), beyond what is strictly necessary for the App to function as described above.'),
      t('Partner will only use this information for: (a) providing you with monitoring and notification features related to Sentry Mode; (b) associating Sentry Mode events with your user account and vehicle; (c) improving service reliability and security (e.g., technical incident diagnostics); (d) complying with applicable legal obligations, where applicable.'),
      t('Partner maintains administrative, technical, and physical safeguards designed to protect Personal Data against accidental, unlawful or unauthorized destruction, loss, alteration, access, disclosure or use, including encryption of data in transit and, where appropriate, at rest. Partner will only retain your Personal Data for as long as necessary to provide you with the App and the features described above, unless otherwise required or authorized by applicable law or if you request early deletion.'),
      `${t('Subject to applicable law (including GDPR), you may have the right to request access and receive information about your Personal Data, update and correct inaccuracies, and request deletion when legal conditions are met. You also have the right to withdraw your consent at any time, without cost, which may however limit or prevent use of the App. To exercise your rights, withdraw your consent or obtain more information about the App and the processing of your Personal Data, you can contact Partner at: hello@sentryguard.org')}`,
      t('By accepting this consent, you also agree to receive occasional emails from Partner regarding product updates, new features, security alerts, and important service announcements. You can unsubscribe from these communications at any time via the unsubscribe link included in each email.'),
      t('I consent to the collection, use, and processing of my Personal Data as described above.'),
    ];

    const fullText = [
      `Version: ${version}`,
      `Locale: ${normalizedLocale}`,
      `Partner: ${partnerName}`,
      `App: ${appTitle}`,
      '',
      ...paragraphs,
    ].join('\n\n');

    const textHash = this.generateTextHash(fullText);

    return {
      version,
      locale: normalizedLocale,
      text: fullText,
      textHash,
      partnerName,
      appTitle,
    };
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
    this.logger.log(`User ${userId} revoking consent and deleting account`);

    const latestConsent = await this.consentRepository.findOne({
      where: { userId, revokedAt: IsNull() },
      order: { acceptedAt: 'DESC' },
    });

    if (!latestConsent) {
      throw new BadRequestException('No active consent found to revoke');
    }

    const vehicles = await this.vehicleRepository.find({
      where: { userId },
    });

    const vehicleVins = vehicles.map((vehicle) => vehicle.vin);

    this.logger.log(
      `Found ${vehicles.length} vehicle(s) for user ${userId}. Emitting consent revoked event...`,
    );

    await this.consentRevokedHandler.handleConsentRevoked({
      userId,
      vehicleVins,
    });

    this.logger.log(`🗑️  Deleting user account ${userId}...`);
    const deleteResult = await this.userRepository.delete({ userId });

    if (deleteResult.affected === 0) {
      this.logger.warn(`User ${userId} not found`);
      return;
    }

    this.logger.log(
      `✅ User account ${userId} deleted (consents and vehicles cascade-deleted)`,
    );
  }

  private createCanonicalConsentText(consentData: ConsentData): string {
    const consentText = this.getConsentText(consentData.version, consentData.locale);
    return consentText.text;
  }

  private generateTextHash(text: string): string {
    return crypto.createHash('sha256').update(text).digest('hex');
  }
}
