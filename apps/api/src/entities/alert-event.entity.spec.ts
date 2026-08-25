import { getMetadataArgsStorage } from 'typeorm';

import { AlertEvent } from './alert-event.entity';

describe('The AlertEvent entity', () => {
  it('should define the pending notification index on notification_status', () => {
    const index = getMetadataArgsStorage().indices.find(
      (metadata) => metadata.target === AlertEvent && metadata.name === 'idx_alert_events_pending'
    );

    expect(index?.columns).toStrictEqual(['notification_status']);
  });
});
