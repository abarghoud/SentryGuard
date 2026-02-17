import { EmailContentBuilderService } from './email-content-builder.service';

jest.mock('../../../i18n');
import i18n from '../../../i18n';
const mockedI18n = i18n as jest.Mocked<typeof i18n>;

describe('The EmailContentBuilderService class', () => {
  let service: EmailContentBuilderService;

  beforeEach(() => {
    service = new EmailContentBuilderService();
    jest.clearAllMocks();
  });

  describe('The buildWelcomeEmail() method', () => {
    describe('When fullName is provided', () => {
      const fullName = 'John Doe';
      const language = 'en';
      const expectedSubject = 'Welcome to SentryGuard!';
      const expectedBody = '<html>Welcome John Doe</html>';

      let result: { subject: string; body: string };

      beforeEach(() => {
        mockedI18n.t.mockImplementation((key: string, options?: any) => {
          if (key === 'welcomeEmailSubject') return expectedSubject;
          if (key === 'welcomeEmailBody') return expectedBody;
          return '';
        });
        process.env.DISCORD_INVITE_URL = '';

        result = service.buildWelcomeEmail(fullName, language);
      });

      it('should return email content with subject', () => {
        expect(result.subject).toBe(expectedSubject);
      });

      it('should return email content with body', () => {
        expect(result.body).toBe(expectedBody);
      });

      it('should call i18n with correct parameters for subject', () => {
        expect(mockedI18n.t).toHaveBeenCalledWith('welcomeEmailSubject', { lng: language });
      });

      it('should call i18n with correct parameters for body', () => {
        expect(mockedI18n.t).toHaveBeenCalledWith('welcomeEmailBody', {
          lng: language,
          name: fullName,
          discordUrl: '',
        });
      });
    });

    describe('When fullName is not provided', () => {
      const language = 'fr';
      const expectedSubject = 'Bienvenue sur SentryGuard !';
      const expectedBody = '<html>Bienvenue</html>';

      let result: { subject: string; body: string };

      beforeEach(() => {
        mockedI18n.t.mockImplementation((key: string, options?: any) => {
          if (key === 'welcomeEmailSubject') return expectedSubject;
          if (key === 'welcomeEmailBodyNoName') return expectedBody;
          return '';
        });
        process.env.DISCORD_INVITE_URL = '';

        result = service.buildWelcomeEmail(undefined, language);
      });

      it('should call i18n with welcomeEmailBodyNoName key', () => {
        expect(mockedI18n.t).toHaveBeenCalledWith('welcomeEmailBodyNoName', {
          lng: language,
          discordUrl: '',
        });
      });

      it('should return email content with subject', () => {
        expect(result.subject).toBe(expectedSubject);
      });

      it('should return email content with body', () => {
        expect(result.body).toBe(expectedBody);
      });
    });
  });
});
