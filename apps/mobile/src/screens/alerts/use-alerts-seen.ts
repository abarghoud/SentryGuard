import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

import { getStoredAlertsSeenAt, storeAlertsSeenAt } from '../../features/alerts/data/alerts-seen-storage';

export function useAlertsSeen(): { lastSeenAt: string | null; markAlertsSeen: () => Promise<void> } {
  const queryClient = useQueryClient();
  const lastSeenQuery = useQuery({
    queryFn: () => getStoredAlertsSeenAt(),
    queryKey: ['alerts-seen-at'],
    staleTime: Infinity,
  });

  const markAlertsSeen = useCallback(async () => {
    const seenAt = new Date().toISOString();
    queryClient.setQueryData(['alerts-seen-at'], seenAt);
    await storeAlertsSeenAt(seenAt);
  }, [queryClient]);

  return { lastSeenAt: lastSeenQuery.data ?? null, markAlertsSeen };
}
