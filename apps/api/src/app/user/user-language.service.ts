import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { SupportedLanguage } from '../../common/utils/language.util';

@Injectable()
export class UserLanguageService {
  private readonly logger = new Logger(UserLanguageService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async getUserLanguage(userId: string): Promise<SupportedLanguage> {
    const dbStart = Date.now();
    const user = await this.userRepository.findOne({
      where: { userId },
      select: {
        preferred_language: true
      },
    });
    const dbTime = Date.now() - dbStart;

    this.logger.log(`[DB_TIME][LANGUAGE_LOOKUP] User lookup: ${dbTime}ms for user: ${userId}`);

    if (!user || !user.preferred_language) {
      return 'en';
    }

    return user.preferred_language as SupportedLanguage;
  }

  async updateUserLanguage(
    userId: string,
    language: SupportedLanguage
  ): Promise<void> {
    await this.userRepository.update({ userId }, { preferred_language: language });
  }
}

