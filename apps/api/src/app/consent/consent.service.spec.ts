import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { IsNull } from 'typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { ConsentService, ConsentData, ConsentStatus, ConsentTextResponse } from './consent.service';
import { UserConsent } from '../../entities/user-consent.entity';
import { User } from '../../entities/user.entity';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as crypto from 'crypto';

jest.mock('crypto');
const mockedCrypto = crypto as jest.Mocked<typeof crypto>;

jest.mock('../../i18n', () => ({
  __esModule: true,
  default: {
    t: jest.fn((key: string) => `translated_${key}`),
  },
}));

const mockConsentRepository = {
  findOne: jest.fn(),
  find: jest.fn(),
  create: jest.fn(),
  save: jest.fn(),
  update: jest.fn(),
};

const mockUserRepository = {
  findOne: jest.fn(),
};

describe('The ConsentService class', () => {
  let service: ConsentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        {
          provide: getRepositoryToken(UserConsent),
          useValue: mockConsentRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);

    jest.clearAllMocks();

    const mockHashInstance = mock<crypto.Hash>();
    mockHashInstance.update.mockReturnThis();
    mockHashInstance.digest.mockReturnValue('mock-hash-value');
    mockedCrypto.createHash = jest.fn().mockReturnValue(mockHashInstance);
  });

  describe('The acceptConsent() method', () => {
    const userId = 'test-user-id';
    const consentData: ConsentData = {
      version: 'v1',
      locale: 'en',
      userAgent: 'test-agent',
      appTitle: 'SentryGuard',
      partnerName: 'SentryGuardOrg',
    };

    let result: UserConsent;
    let mockUser: User;
    let mockConsent: UserConsent;

    beforeEach(() => {
      mockUser = { userId } as User;
      mockConsent = {
        id: 'consent-id',
        userId,
        ...consentData,
        textHash: 'mock-hash-value',
        acceptedAt: new Date(),
      } as UserConsent;
    });

    describe('When user exists and consent is accepted', () => {
      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockConsentRepository.update.mockResolvedValue({ affected: 1 });
        mockConsentRepository.create.mockReturnValue(mockConsent);
        mockConsentRepository.save.mockResolvedValue(mockConsent);
        result = await service.acceptConsent(userId, consentData);
      });

      it('should return created consent', () => {
        expect(result).toEqual(mockConsent);
      });

      it('should check if user exists', () => {
        expect(mockUserRepository.findOne).toHaveBeenCalledWith({
          where: { userId },
        });
      });

      it('should revoke existing active consents', () => {
        expect(mockConsentRepository.update).toHaveBeenCalledWith(
          { userId, revokedAt: IsNull() },
          { revokedAt: expect.any(Date) }
        );
      });

      it('should create new consent', () => {
        expect(mockConsentRepository.create).toHaveBeenCalled();
      });

      it('should save new consent', () => {
        expect(mockConsentRepository.save).toHaveBeenCalled();
      });
    });

    describe('When user does not exist', () => {
      let act: () => Promise<UserConsent>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(null);
        act = () => service.acceptConsent(userId, consentData);
      });

      it('should throw NotFoundException', async () => {
        await expect(act()).rejects.toThrow(NotFoundException);
      });

      it('should not create consent', () => {
        expect(mockConsentRepository.create).not.toHaveBeenCalled();
      });
    });

    describe('When accepting consent', () => {
      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(mockUser);
        mockConsentRepository.update.mockResolvedValue({ affected: 1 });
        mockConsentRepository.create.mockReturnValue(mockConsent);
        mockConsentRepository.save.mockResolvedValue(mockConsent);
        result = await service.acceptConsent(userId, consentData);
      });

      it('should generate textHash', () => {
        expect(mockedCrypto.createHash).toHaveBeenCalled();
      });

      it('should use generated textHash', () => {
        expect(mockConsentRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            textHash: 'mock-hash-value',
          })
        );
      });
    });
  });

  describe('The getConsentText() method', () => {
    let result: ConsentTextResponse;
    let version: string;
    let locale: string;

    describe('When called with version and locale', () => {
      beforeEach(() => {
        version = 'v1';
        locale = 'en';
        result = service.getConsentText(version, locale);
      });

      it('should return consent text response with version', () => {
        expect(result.version).toBe(version);
      });

      it('should return consent text response with locale', () => {
        expect(result.locale).toBe(locale);
      });

      it('should include version in text', () => {
        expect(result.text).toContain(`Version: ${version}`);
      });

      it('should include locale in text', () => {
        expect(result.text).toContain(`Locale: ${locale}`);
      });

      it('should include partner name in text', () => {
        expect(result.text).toContain('Partner: SentryGuardOrg');
      });

      it('should include app title in text', () => {
        expect(result.text).toContain('App: SentryGuard');
      });

      it('should return textHash', () => {
        expect(result.textHash).toBe('mock-hash-value');
      });

      it('should return partnerName', () => {
        expect(result.partnerName).toBe('SentryGuardOrg');
      });

      it('should return appTitle', () => {
        expect(result.appTitle).toBe('SentryGuard');
      });
    });

    describe('When locale is empty', () => {
      beforeEach(() => {
        version = 'v1';
        locale = '';
        result = service.getConsentText(version, locale);
      });

      it('should default locale to en', () => {
        expect(result.locale).toBe('en');
      });

      it('should include default locale in text', () => {
        expect(result.text).toContain('Locale: en');
      });
    });

    describe('When text is generated', () => {
      beforeEach(() => {
        result = service.getConsentText('v1', 'en');
      });

      it('should include translated paragraphs', () => {
        expect(result.text).toContain('translated_');
      });

      it('should include Tesla privacy URL', () => {
        expect(result.text).toContain('https://www.tesla.com/legal/privacy');
      });
    });
  });

  describe('The getCurrentConsent() method', () => {
    const userId = 'test-user-id';
    let result: ConsentStatus;

    describe('When no consent exists', () => {
      beforeEach(async () => {
        mockConsentRepository.findOne.mockResolvedValue(null);
        result = await service.getCurrentConsent(userId);
      });

      it('should return hasConsent false', () => {
        expect(result.hasConsent).toBe(false);
      });

      it('should return isRevoked false', () => {
        expect(result.isRevoked).toBe(false);
      });

      it('should not return latestConsent', () => {
        expect(result.latestConsent).toBeUndefined();
      });
    });

    describe('When active consent exists', () => {
      let mockConsent: UserConsent;

      beforeEach(async () => {
        mockConsent = {
          id: 'consent-id',
          userId,
          version: 'v1',
          acceptedAt: new Date(),
          revokedAt: null,
        } as unknown as UserConsent;
        mockConsentRepository.findOne.mockResolvedValue(mockConsent);
        result = await service.getCurrentConsent(userId);
      });

      it('should return hasConsent true', () => {
        expect(result.hasConsent).toBe(true);
      });

      it('should return isRevoked false', () => {
        expect(result.isRevoked).toBe(false);
      });

      it('should return latestConsent', () => {
        expect(result.latestConsent).toEqual(mockConsent);
      });
    });

    describe('When consent is revoked', () => {
      let mockConsent: UserConsent;

      beforeEach(async () => {
        mockConsent = {
          id: 'consent-id',
          userId,
          version: 'v1',
          acceptedAt: new Date(),
          revokedAt: new Date(),
        } as UserConsent;
        mockConsentRepository.findOne.mockResolvedValue(mockConsent);
        result = await service.getCurrentConsent(userId);
      });

      it('should return hasConsent false', () => {
        expect(result.hasConsent).toBe(false);
      });

      it('should return isRevoked true', () => {
        expect(result.isRevoked).toBe(true);
      });

      it('should not return latestConsent', () => {
        expect(result.latestConsent).toBeUndefined();
      });
    });
  });

  describe('The revokeConsent() method', () => {
    const userId = 'test-user-id';
    let act: () => Promise<void>;

    describe('When active consent exists', () => {
      let mockConsent: UserConsent;

      beforeEach(async () => {
        mockConsent = {
          id: 'consent-id',
          userId,
          version: 'v1',
          acceptedAt: new Date(),
          revokedAt: null,
        } as unknown as UserConsent;
        mockConsentRepository.findOne.mockResolvedValue(mockConsent);
        mockConsentRepository.update.mockResolvedValue({ affected: 1 });
        act = () => service.revokeConsent(userId);
        await act();
      });

      it('should find active consent', () => {
        expect(mockConsentRepository.findOne).toHaveBeenCalledWith({
          where: { userId, revokedAt: IsNull() },
          order: { acceptedAt: 'DESC' },
        });
      });

      it('should update consent with revokedAt', () => {
        expect(mockConsentRepository.update).toHaveBeenCalledWith(
          { id: mockConsent.id },
          { revokedAt: expect.any(Date) }
        );
      });
    });

    describe('When no active consent exists', () => {
      beforeEach(() => {
        mockConsentRepository.findOne.mockResolvedValue(null);
        act = () => service.revokeConsent(userId);
      });

      it('should throw BadRequestException', async () => {
        await expect(act()).rejects.toThrow(BadRequestException);
      });

      it('should not update consent', () => {
        expect(mockConsentRepository.update).not.toHaveBeenCalled();
      });
    });
  });

  describe('The generateTextHash() method', () => {
    let result: string;
    let text: string;
    let mockHash: MockProxy<crypto.Hash>;

    beforeEach(() => {
      text = 'test text';
      mockHash = mock<crypto.Hash>();
      mockHash.update.mockReturnThis();
      mockHash.digest.mockReturnValue('abc123');
      mockedCrypto.createHash.mockReturnValue(mockHash);
      result = service.generateTextHash(text);
    });

    it('should create SHA256 hash', () => {
      expect(mockedCrypto.createHash).toHaveBeenCalledWith('sha256');
    });

    it('should update hash with text', () => {
      expect(mockHash.update).toHaveBeenCalledWith(text);
    });

    it('should digest hash as hex', () => {
      expect(mockHash.digest).toHaveBeenCalledWith('hex');
    });

    it('should return hash value', () => {
      expect(result).toBe('abc123');
    });
  });
});
