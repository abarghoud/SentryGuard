import { useCallback, useEffect, useState } from 'react';

import { tokenStore } from '../api';

export interface MobileSession {
  clearToken(): Promise<void>;
  isReady: boolean;
  setToken(token: string): Promise<void>;
  token: string | null;
}

export function useSession(): MobileSession {
  const [isReady, setIsReady] = useState(false);
  const [token, setTokenState] = useState<string | null>(null);

  useEffect(() => {
    tokenStore
      .loadFromStorage()
      .then((storedToken) => setTokenState(storedToken))
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => tokenStore.subscribe(setTokenState), []);

  const setToken = useCallback(async (nextToken: string) => {
    await tokenStore.store(nextToken);
  }, []);

  const clearToken = useCallback(async () => {
    await tokenStore.clear();
  }, []);

  return {
    clearToken,
    isReady,
    setToken,
    token,
  };
}
