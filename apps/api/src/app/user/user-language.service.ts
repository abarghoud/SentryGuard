import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';

@Injectable()
export class UserLanguageService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>
  ) {}

  async getUserLanguage(userId: string): Promise<'en' | 'fr'> {
    const user = await this.userRepository.findOne({
      where: { userId },
      select: ['preferred_language'],
    });

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

