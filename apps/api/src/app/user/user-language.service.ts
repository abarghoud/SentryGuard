import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserLanguageService {
  private readonly logger = new Logger(UserLanguageService.name);
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async getUserLanguage(userId: string): Promise<'en' | 'fr'> {
    const dbStart = Date.now();
    const user = await this.userRepository.findOne({
      where: { userId },
      select: ['preferred_language'],
    });
    const dbTime = Date.now() - dbStart;

    this.logger.log(`[DB_TIME][LANGUAGE_LOOKUP] User lookup: ${dbTime}ms for user: ${userId}`);

    if (!user || !user.preferred_language) {
      return 'en';
    }

    return user.preferred_language as 'en' | 'fr';
  }

  async updateUserLanguage(
    userId: string,
    language: 'en' | 'fr'
  ): Promise<void> {
    await this.userRepository.update({ userId }, { preferred_language: language });
  }
}

