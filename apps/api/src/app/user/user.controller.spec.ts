import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserLanguageService } from './user-language.service';
import { User } from '../../entities/user.entity';

describe('UserController', () => {
  let controller: UserController;
  let userLanguageService: UserLanguageService;

  const mockUserLanguageService = {
    updateUserLanguage: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserController],
      providers: [
        {
          provide: UserLanguageService,
          useValue: mockUserLanguageService,
        },
      ],
    }).compile();

    controller = module.get<UserController>(UserController);
    userLanguageService = module.get<UserLanguageService>(UserLanguageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('updateLanguage', () => {
    const mockUser = {
      userId: 'test-user-id',
      email: 'test@example.com',
    } as User;

    it('should update language to English', async () => {
      const body = { language: 'en' };
      mockUserLanguageService.updateUserLanguage.mockResolvedValue(undefined);

      const result = await controller.updateLanguage(mockUser, body);

      expect(result).toEqual({
        success: true,
        language: 'en',
      });
      expect(userLanguageService.updateUserLanguage).toHaveBeenCalledWith(
        'test-user-id',
        'en'
      );
    });

    it('should update language to French', async () => {
      const body = { language: 'fr' };
      mockUserLanguageService.updateUserLanguage.mockResolvedValue(undefined);

      const result = await controller.updateLanguage(mockUser, body);

      expect(result).toEqual({
        success: true,
        language: 'fr',
      });
      expect(userLanguageService.updateUserLanguage).toHaveBeenCalledWith(
        'test-user-id',
        'fr'
      );
    });

    it('should throw BadRequestException for invalid language', async () => {
      const body = { language: 'es' };

      await expect(controller.updateLanguage(mockUser, body)).rejects.toThrow(
        BadRequestException
      );
      expect(userLanguageService.updateUserLanguage).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for missing language', async () => {
      const body = {} as any;

      await expect(controller.updateLanguage(mockUser, body)).rejects.toThrow(
        BadRequestException
      );
      expect(userLanguageService.updateUserLanguage).not.toHaveBeenCalled();
    });
  });
});

