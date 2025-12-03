import { Test, TestingModule } from '@nestjs/testing';
import { mock, MockProxy } from 'jest-mock-extended';
import { ConsentController } from './consent.controller';
import { ConsentService, ConsentStatus, ConsentTextResponse, ConsentData } from './consent.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { User } from '../../entities/user.entity';
import { UserConsent } from '../../entities/user-consent.entity';

type AcceptConsentRequest = Parameters<typeof ConsentController.prototype.acceptConsent>[2] & {
  connection?: {
    remoteAddress?: string;
    socket?: {
      remoteAddress?: string;
    };
  };
  socket?: {
    remoteAddress?: string;
  };
};

const mockConsentService = {
  getConsentText: jest.fn(),
  getCurrentConsent: jest.fn(),
  acceptConsent: jest.fn(),
  revokeConsent: jest.fn(),
};

const mockJwtAuthGuard = {
  canActivate: jest.fn(() => true),
};

describe('The ConsentController class', () => {
  let controller: ConsentController;
  let consentService: ConsentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConsentController],
      providers: [
        {
          provide: ConsentService,
          useValue: mockConsentService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    controller = module.get<ConsentController>(ConsentController);
    consentService = module.get<ConsentService>(ConsentService);

    jest.clearAllMocks();
  });

  describe('The getConsentText() method', () => {
    let result: ConsentTextResponse;
    let mockResponse: ConsentTextResponse;

    beforeEach(() => {
      mockResponse = {
        version: 'v1',
        locale: 'en',
        text: 'consent text',
        textHash: 'hash',
        partnerName: 'SentryGuardOrg',
        appTitle: 'SentryGuard',
      };
      mockConsentService.getConsentText.mockReturnValue(mockResponse);
    });

    describe('When called with default parameters', () => {
      beforeEach(async () => {
        result = await controller.getConsentText();
      });

      it('should return consent text response', () => {
        expect(result).toEqual(mockResponse);
      });

      it('should call service with default version and locale', () => {
        expect(consentService.getConsentText).toHaveBeenCalledWith('v1', 'en');
      });
    });

    describe('When called with custom version and locale', () => {
      beforeEach(async () => {
        mockResponse = {
          version: 'v2',
          locale: 'fr',
          text: 'texte de consentement',
          textHash: 'hash',
          partnerName: 'SentryGuardOrg',
          appTitle: 'SentryGuard',
        };
        mockConsentService.getConsentText.mockReturnValue(mockResponse);
        result = await controller.getConsentText('v2', 'fr');
      });

      it('should return consent text response', () => {
        expect(result).toEqual(mockResponse);
      });

      it('should call service with custom version and locale', () => {
        expect(consentService.getConsentText).toHaveBeenCalledWith('v2', 'fr');
      });
    });
  });

  describe('The getCurrentConsent() method', () => {
    let result: ConsentStatus;
    let mockUser: User;
    let mockStatus: ConsentStatus;

    beforeEach(() => {
      mockUser = { userId: 'test-user-id' } as User;
    });

    describe('When user has active consent', () => {
      beforeEach(async () => {
        mockStatus = {
          hasConsent: true,
          isRevoked: false,
          latestConsent: {
            id: 'consent-id',
            userId: 'test-user-id',
            version: 'v1',
            acceptedAt: new Date(),
          } as UserConsent,
        };
        mockConsentService.getCurrentConsent.mockResolvedValue(mockStatus);
        result = await controller.getCurrentConsent(mockUser);
      });

      it('should return consent status', () => {
        expect(result).toEqual(mockStatus);
      });

      it('should call service with user id', () => {
        expect(consentService.getCurrentConsent).toHaveBeenCalledWith('test-user-id');
      });
    });

    describe('When user has no consent', () => {
      beforeEach(async () => {
        mockStatus = {
          hasConsent: false,
          isRevoked: false,
        };
        mockConsentService.getCurrentConsent.mockResolvedValue(mockStatus);
        result = await controller.getCurrentConsent(mockUser);
      });

      it('should return consent status with hasConsent false', () => {
        expect(result).toEqual(mockStatus);
      });
    });
  });

  describe('The acceptConsent() method', () => {
    let result: { success: boolean; consent: { id: string; acceptedAt: Date; version: string } };
    let mockUser: User;
    let consentData: Pick<ConsentData, 'version' | 'locale'>;
    let mockRequest: MockProxy<AcceptConsentRequest>;
    let mockConsent: UserConsent;

    beforeEach(() => {
      mockUser = { userId: 'test-user-id' } as User;
      consentData = {
        version: 'v1',
        locale: 'en',
      };
      mockConsent = {
        id: 'consent-id',
        acceptedAt: new Date(),
        version: 'v1',
      } as UserConsent;
      mockConsentService.acceptConsent.mockResolvedValue(mockConsent);
    });

    describe('When x-forwarded-for header is present', () => {
      beforeEach(async () => {
        mockRequest = mock<AcceptConsentRequest>();
        mockRequest.get.mockImplementation((header: string) => {
          if (header === 'User-Agent') return 'test-agent';
          if (header === 'x-forwarded-for') return '192.168.1.1';
          return undefined;
        });
        result = await controller.acceptConsent(mockUser, consentData as ConsentData, mockRequest);
      });

      it('should return success response', () => {
        expect(result.success).toBe(true);
      });

      it('should return consent data', () => {
        expect(result.consent.id).toBe('consent-id');
        expect(result.consent.version).toBe('v1');
      });

      it('should call service with correct consent data', () => {
        expect(consentService.acceptConsent).toHaveBeenCalledWith(
          'test-user-id',
          expect.objectContaining({
            version: 'v1',
            locale: 'en',
            userAgent: 'test-agent',
            appTitle: 'SentryGuard',
            partnerName: 'SentryGuardOrg',
          })
        );
      });
    });
  });

  describe('The revokeConsent() method', () => {
    let result: { success: boolean; message: string };
    let mockUser: User;

    beforeEach(async () => {
      mockUser = { userId: 'test-user-id' } as User;
      mockConsentService.revokeConsent.mockResolvedValue(undefined);
      result = await controller.revokeConsent(mockUser);
    });

    it('should return success response', () => {
      expect(result.success).toBe(true);
    });

    it('should return success message', () => {
      expect(result.message).toBe('Consent revoked successfully');
    });

    it('should call service with user id', () => {
      expect(consentService.revokeConsent).toHaveBeenCalledWith('test-user-id');
    });
  });
});
