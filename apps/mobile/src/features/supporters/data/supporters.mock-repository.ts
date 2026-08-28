import { SupportersData } from '../domain/entities';
import { SupportersRepositoryRequirements } from '../domain/supporters.repository.requirements';

export class SupportersMockRepository implements SupportersRepositoryRequirements {
  public async getSupporters(): Promise<SupportersData> {
    return {
      hasActiveSupporters: true,
      subscribers: [],
      supporters: [
        {
          coffees: 35,
          id: 'mock-don-1',
          isSubscriber: true,
          monthlyCoffees: 1,
          name: 'Alexandre D.',
          supportDate: '2026-05-29T00:00:00.000Z',
        },
        {
          coffees: 10,
          id: 'mock-don-2',
          name: 'TeslaFan92',
          supportDate: '2026-07-01T00:00:00.000Z',
        },
        {
          coffees: 10,
          id: 'mock-don-3',
          isSubscriber: true,
          monthlyCoffees: 1,
          name: 'Sophie M.',
          supportDate: '2026-06-15T00:00:00.000Z',
        },
        {
          coffees: 8,
          id: 'mock-don-4',
          message: 'Merci pour ce travail exceptionnel sur le mode Sentinelle !',
          name: 'Julien T.',
          supportDate: '2026-08-04T00:00:00.000Z',
        },
        {
          coffees: 8,
          id: 'mock-don-5',
          name: 'CyberDriver',
          supportDate: '2026-07-02T00:00:00.000Z',
        },
        {
          coffees: 5,
          id: 'mock-don-6',
          name: 'Maxime B.',
          supportDate: '2026-08-14T00:00:00.000Z',
        },
        {
          coffees: 3,
          id: 'mock-don-7',
          isSubscriber: true,
          monthlyCoffees: 3,
          name: 'Lucas R.',
          supportDate: '2026-08-26T00:00:00.000Z',
        },
        {
          coffees: 1,
          id: 'mock-don-8',
          isSubscriber: true,
          monthlyCoffees: 1,
          name: 'Clara P.',
          supportDate: '2026-08-25T00:00:00.000Z',
        },
      ],
      totalCoffeesCount: 78,
    };
  }
}
