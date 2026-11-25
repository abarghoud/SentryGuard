import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { NotificationPreferences } from '../../entities/notification-preferences.entity';

@Injectable()
export class NotificationPreferencesRepository {
  constructor(
    @InjectRepository(NotificationPreferences)
    private readonly preferencesRepository: Repository<NotificationPreferences>
  ) {}

  public async findOrCreate(userId: string): Promise<NotificationPreferences> {
    const preferences = await this.preferencesRepository.findOne({ where: { userId } });
    return preferences ?? (await this.createUnlessCreatedMeanwhile(userId));
  }

  private async createUnlessCreatedMeanwhile(userId: string): Promise<NotificationPreferences> {
    await this.preferencesRepository.createQueryBuilder().insert().values({ userId }).orIgnore().execute();
    return await this.preferencesRepository.findOneOrFail({ where: { userId } });
  }
}
