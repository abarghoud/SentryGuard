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
    // Get pool statistics before query
    const connection = this.userRepository.manager.connection;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const driver = connection.driver as any;
    const pool = driver.master || driver.pool;
    const poolStats = pool 
      ? `Pool(idle:${pool.idleCount || 0}/${pool.totalCount || 0},waiting:${pool.waitingCount || 0})`
      : 'Pool(N/A)';

    const dbStart = Date.now();
    const user = await this.userRepository.findOne({
      where: { userId },
      select: ['preferred_language'],
    });
    const dbTime = Date.now() - dbStart;

    this.logger.log(`[DB_TIME][LANGUAGE_LOOKUP] ${dbTime}ms | ${poolStats} | User: ${userId}`);

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

