import { ZeptomailService } from './zeptomail.service';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');
const mockedNodemailer = nodemailer as jest.Mocked<typeof nodemailer>;

describe('The ZeptomailService class', () => {
  const originalEnv = process.env;
  let mockTransporter: { sendMail: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();

    process.env = {
      ...originalEnv,
      ZEPTOMAIL_API_KEY: 'test-api-key',
      ZEPTOMAIL_PORT: '587',
      ZEPTOMAIL_FROM_EMAIL: 'test@sentryguard.org',
      ZEPTOMAIL_FROM_NAME: 'TestSentryGuard',
    };

    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    };

    mockedNodemailer.createTransport.mockReturnValue(mockTransporter as any);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('When constructing the service', () => {
    describe('When required environment variables are missing', () => {
      it('should throw error when ZEPTOMAIL_API_KEY is missing', () => {
        delete process.env.ZEPTOMAIL_API_KEY;

        expect(() => new ZeptomailService()).toThrow(
          'ZEPTOMAIL_API_KEY environment variable is required'
        );
      });

      it('should throw error when ZEPTOMAIL_FROM_EMAIL is missing', () => {
        delete process.env.ZEPTOMAIL_FROM_EMAIL;

        expect(() => new ZeptomailService()).toThrow(
          'ZEPTOMAIL_FROM_EMAIL environment variable is required'
        );
      });
    });

    describe('When all required environment variables are present', () => {
      let service: ZeptomailService;

      beforeEach(() => {
        service = new ZeptomailService();
      });

      it('should create transporter with correct host', () => {
        expect(mockedNodemailer.createTransport).toHaveBeenCalledWith(
          expect.objectContaining({
            host: 'smtp.zeptomail.com',
          })
        );
      });

      it('should create transporter with correct port', () => {
        expect(mockedNodemailer.createTransport).toHaveBeenCalledWith(
          expect.objectContaining({
            port: 587,
          })
        );
      });

      it('should create transporter with correct auth', () => {
        expect(mockedNodemailer.createTransport).toHaveBeenCalledWith(
          expect.objectContaining({
            auth: {
              user: 'emailapikey',
              pass: 'test-api-key',
            },
          })
        );
      });

      it('should create service instance', () => {
        expect(service).toBeInstanceOf(ZeptomailService);
      });
    });
  });

  describe('The sendEmail() method', () => {
    let service: ZeptomailService;
    const to = 'recipient@example.com';
    const subject = 'Test Subject';
    const htmlBody = '<h1>Test Body</h1>';

    beforeEach(() => {
      service = new ZeptomailService();
    });

    describe('When sending email successfully', () => {
      beforeEach(async () => {
        await service.sendEmail(to, subject, htmlBody);
      });

      it('should call sendMail', () => {
        expect(mockTransporter.sendMail).toHaveBeenCalledWith(
          expect.any(Object)
        );
      });

      it('should include correct recipient email', () => {
        expect(mockTransporter.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            to: to,
          })
        );
      });

      it('should include correct from address', () => {
        expect(mockTransporter.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            from: '"TestSentryGuard" <test@sentryguard.org>',
          })
        );
      });

      it('should include correct subject', () => {
        expect(mockTransporter.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            subject: subject,
          })
        );
      });

      it('should include correct html body', () => {
        expect(mockTransporter.sendMail).toHaveBeenCalledWith(
          expect.objectContaining({
            html: htmlBody,
          })
        );
      });
    });

    describe('When sendMail fails', () => {
      const expectedError = new Error('SMTP Error');
      let act: () => Promise<void>;

      beforeEach(() => {
        mockTransporter.sendMail.mockRejectedValue(expectedError);
        act = () => service.sendEmail(to, subject, htmlBody);
      });

      it('should throw the error', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });
  });
});
