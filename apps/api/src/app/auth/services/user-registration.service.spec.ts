import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserRegistrationService } from './user-registration.service';
import { User } from '../../../entities/user.entity';
import { WaitlistService } from '../../waitlist/services/waitlist.service';
import { UserNotApprovedException } from '../../../common/exceptions/user-not-approved.exception';
import { mock, MockProxy } from 'jest-mock-extended';

jest.mock('crypto');
import * as crypto from 'crypto';
const mockedRandomBytes = crypto.randomBytes as jest.MockedFunction<
  typeof crypto.randomBytes
>;

jest.mock('../../../common/utils/crypto.util');
import { encrypt } from '../../../common/utils/crypto.util';
const mockedEncrypt = encrypt as jest.MockedFunction<typeof encrypt>;

describe('The UserRegistrationService class', () => {
  let service: UserRegistrationService;
  let mockWaitlistService: MockProxy<WaitlistService>;

  const mockUserRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
  };

  beforeEach(async () => {
    mockWaitlistService = mock<WaitlistService>();
    mockWaitlistService.isApproved.mockResolvedValue(true);
    mockWaitlistService.addToWaitlist.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRegistrationService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: WaitlistService,
          useValue: mockWaitlistService,
        },
      ],
    }).compile();

    service = module.get<UserRegistrationService>(UserRegistrationService);

    jest.clearAllMocks();
    mockedEncrypt.mockClear();

    mockUserRepository.findOne.mockResolvedValue(null);
    mockUserRepository.save.mockImplementation((user) =>
      Promise.resolve(user)
    );

    mockedRandomBytes.mockImplementation((size: number) => {
      return Buffer.from('test-user-id-pad'.repeat(2).slice(0, size));
    });

    mockedEncrypt.mockReturnValue('encrypted-value');
    mockJwtService.signAsync.mockResolvedValue('new-jwt-token');
  });

  describe('The createOrUpdateUser() method', () => {
    const fakeTokens = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expiresAt: new Date(Date.now() + 3600000),
    };

    describe('When the user already exists', () => {
      const existingUser = {
        userId: 'existing-user-id',
        email: 'existing@tesla.com',
        full_name: 'Old Name',
      } as User;

      let result: string;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValueOnce(existingUser);

        result = await service.createOrUpdateUser(
          fakeTokens,
          { email: 'existing@tesla.com', full_name: 'New Name' },
          'en'
        );
      });

      it('should return the existing user ID', () => {
        expect(result).toBe('existing-user-id');
      });

      it('should update the user profile', () => {
        expect(mockUserRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            full_name: 'New Name',
          })
        );
      });
    });

    describe('When creating a new user', () => {
      let result: string;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockImplementation(
          (userData) => userData as User
        );

        result = await service.createOrUpdateUser(
          fakeTokens,
          { email: 'new@tesla.com', full_name: 'New User' },
          'fr'
        );
      });

      it('should return a generated user ID', () => {
        expect(result).toBeDefined();
      });

      it('should create the user with the correct locale', () => {
        expect(mockUserRepository.create).toHaveBeenCalledWith(
          expect.objectContaining({
            preferred_language: 'fr',
          })
        );
      });
    });

    describe('When profile is undefined', () => {
      let result: string;

      beforeEach(async () => {
        mockUserRepository.create.mockImplementation(
          (userData) => userData as User
        );

        result = await service.createOrUpdateUser(
          fakeTokens,
          undefined,
          'en'
        );
      });

      it('should create a new user without searching by email', () => {
        expect(result).toBeDefined();
        expect(mockUserRepository.findOne).not.toHaveBeenCalled();
      });

      it('should not check waitlist', () => {
        expect(mockWaitlistService.isApproved).not.toHaveBeenCalled();
      });
    });
  });

  describe('The createOrUpdateUser() method (waitlist behavior)', () => {
    const fakeTokens = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      expiresAt: new Date(Date.now() + 3600000),
    };

    describe('When the new user is not approved', () => {
      const fakeProfile = {
        email: 'waitlisted@tesla.com',
        full_name: 'Waitlisted User',
      };
      let act: () => Promise<string>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(null);
        mockWaitlistService.isApproved.mockResolvedValue(false);

        act = async () =>
          service.createOrUpdateUser(fakeTokens, fakeProfile, 'fr');
      });

      it('should throw UserNotApprovedException', async () => {
        await expect(act()).rejects.toThrow(UserNotApprovedException);
      });

      it('should add the user to the waitlist with locale', async () => {
        try {
          await act();
        } catch {
          // expected
        }

        expect(mockWaitlistService.addToWaitlist).toHaveBeenCalledWith(
          'waitlisted@tesla.com',
          'Waitlisted User',
          'fr'
        );
      });
    });

    describe('When the new user has no email', () => {
      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockImplementation(
          (userData) => userData as User
        );

        await service.createOrUpdateUser(fakeTokens, undefined, 'en');
      });

      it('should not check the waitlist', () => {
        expect(mockWaitlistService.isApproved).not.toHaveBeenCalled();
      });
    });

    describe('When the new user is approved', () => {
      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(null);
        mockUserRepository.create.mockImplementation(
          (userData) => userData as User
        );
        mockWaitlistService.isApproved.mockResolvedValue(true);

        await service.createOrUpdateUser(
          fakeTokens,
          { email: 'approved@tesla.com' },
          'en'
        );
      });

      it('should not add to waitlist', () => {
        expect(mockWaitlistService.addToWaitlist).not.toHaveBeenCalled();
      });
    });
  });
});
