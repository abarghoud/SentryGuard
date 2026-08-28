import { Supporter, SupporterType } from '../../entities/supporter.entity';
import { aggregateSupporters } from './supporter-aggregator.util';

describe('The supporter-aggregator utility', () => {
  describe('The aggregateSupporters() function', () => {
    describe('When aggregating multiple donations from same user', () => {
      it('should sum coffee counts and use latest date', () => {
        const item1: Supporter = {
          id: '1',
          name: 'Yvan',
          email: 'yvan@example.com',
          coffees: 5,
          type: SupporterType.Donation,
          is_active: true,
          support_date: new Date('2024-01-01T10:00:00Z'),
          created_at: new Date(),
          updated_at: new Date(),
        };

        const item2: Supporter = {
          id: '2',
          name: 'Yvan M.',
          email: 'yvan@example.com',
          coffees: 10,
          type: SupporterType.Donation,
          is_active: true,
          support_date: new Date('2024-01-05T10:00:00Z'),
          created_at: new Date(),
          updated_at: new Date(),
        };

        const result = aggregateSupporters([item1, item2]);

        expect(result).toHaveLength(1);
        expect(result[0].coffees).toBe(15);
        expect(result[0].name).toBe('Yvan M.');
        expect(result[0].supportDate).toBe('2024-01-05T10:00:00.000Z');
      });
    });

    describe('When grouping anonymous contributors without email', () => {
      it('should not merge separate anonymous contributors', () => {
        const item1: Supporter = {
          id: 'anon-1',
          name: 'Anonymous',
          coffees: 1,
          type: SupporterType.Donation,
          is_active: true,
          support_date: new Date('2024-01-01T10:00:00Z'),
          created_at: new Date(),
          updated_at: new Date(),
        };

        const item2: Supporter = {
          id: 'anon-2',
          name: 'Someone',
          coffees: 2,
          type: SupporterType.Donation,
          is_active: true,
          support_date: new Date('2024-01-02T10:00:00Z'),
          created_at: new Date(),
          updated_at: new Date(),
        };

        const result = aggregateSupporters([item1, item2]);

        expect(result).toHaveLength(2);
        expect(result[0].coffees).toBe(2);
        expect(result[1].coffees).toBe(1);
      });
    });
  });
});
