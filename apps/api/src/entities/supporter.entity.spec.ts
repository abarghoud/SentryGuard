import { getMetadataArgsStorage } from 'typeorm';
import { Supporter } from './supporter.entity';

describe('The Supporter entity', () => {
  it('should define an index on type and is_active columns', () => {
    const index = getMetadataArgsStorage().indices.find(
      (metadata) => metadata.target === Supporter
    );

    expect(index?.columns).toStrictEqual(['type', 'is_active']);
  });
});
