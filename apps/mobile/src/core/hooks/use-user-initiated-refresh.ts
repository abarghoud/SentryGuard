import { useCallback, useState } from 'react';

type Refetch = () => Promise<unknown>;

interface UserInitiatedRefresh {
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function useUserInitiatedRefresh(refetchers: readonly Refetch[]): UserInitiatedRefresh {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    setIsRefreshing(true);
    await Promise.allSettled(refetchers.map((refetch) => refetch()));
    setIsRefreshing(false);
  }, [refetchers]);

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

  return { isRefreshing, onRefresh };
}
