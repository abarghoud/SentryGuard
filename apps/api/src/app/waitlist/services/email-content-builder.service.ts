import { Injectable } from '@nestjs/common';
import i18n from '../../../i18n';

export interface EmailContent {
  subject: string;
  body: string;
}

@Injectable()
export class EmailContentBuilderService {
  public buildWelcomeEmail(
    fullName: string | undefined,
    language: string
  ): EmailContent {
    const bodyKey = fullName ? 'welcomeEmailBody' : 'welcomeEmailBodyNoName';
    const interpolation = fullName ? { name: fullName } : {};

    return {
      subject: i18n.t('welcomeEmailSubject', { lng: language }),
      body: i18n.t(bodyKey, { lng: language, ...interpolation }),
    };
  }
}
