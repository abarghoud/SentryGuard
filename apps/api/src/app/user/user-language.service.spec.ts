import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserLanguageService } from './user-language.service';
import { User } from '../../entities/user.entity';

describe('UserLanguageService', () => {
  let service: UserLanguageService;
  let userRepository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    update: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserLanguageService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UserLanguageService>(UserLanguageService);
    userRepository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getUserLanguage', () => {
    it('should return user preferred language', async () => {
      const mockUser: Partial<User> = {
        userId: 'test-user-id',
        preferred_language: 'fr',
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserLanguage('test-user-id');

      expect(result).toBe('fr');
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'test-user-id' },
        select: ['preferred_language'],
      });
    });

    it('should return "en" when user not found', async () => {
      mockUserRepository.findOne.mockResolvedValue(null);

      const result = await service.getUserLanguage('non-existent-user');

      expect(result).toBe('en');
    });

    it('should return "en" when user has no preferred_language', async () => {
      const mockUser: Partial<User> = {
        userId: 'test-user-id',
        preferred_language: undefined,
      };

      mockUserRepository.findOne.mockResolvedValue(mockUser);

      const result = await service.getUserLanguage('test-user-id');

      expect(result).toBe('en');
    });
  });

  describe('updateUserLanguage', () => {
    it('should update user language to French', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateUserLanguage('test-user-id', 'fr');

      expect(userRepository.update).toHaveBeenCalledWith(
        { userId: 'test-user-id' },
        { preferred_language: 'fr' }
      );
    });

    it('should update user language to English', async () => {
      mockUserRepository.update.mockResolvedValue({ affected: 1 });

      await service.updateUserLanguage('test-user-id', 'en');

      expect(userRepository.update).toHaveBeenCalledWith(
        { userId: 'test-user-id' },
        { preferred_language: 'en' }
      );
    });
  });
});

