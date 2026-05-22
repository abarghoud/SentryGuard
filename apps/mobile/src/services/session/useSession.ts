import { useCallback, useEffect, useState } from 'react';

import { getStoredToken, removeStoredToken, storeToken } from './token-storage';
import { setAccessToken, subscribeAccessToken } from '../api/token-state';

export interface MobileSession {
  clearToken(): Promise<void>;
  isReady: boolean;
  setToken(token: string): Promise<void>;
  token: string | null;
}

export function useSession(): MobileSession {
  const [isReady, setIsReady] = useState(false);
  const [token, updateToken] = useState<string | null>(null);

  useEffect(() => {
    getStoredToken()
      .then((storedToken) => {
        updateToken(storedToken);
        setAccessToken(storedToken);
      })
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => subscribeAccessToken(updateToken), []);

  const setToken = useCallback(async (nextToken: string) => {
    await storeToken(nextToken);
    setAccessToken(nextToken);
  }, []);

  const clearToken = useCallback(async () => {
    await removeStoredToken();
    setAccessToken(null);
  }, []);

  return {
    clearToken,
    isReady,
    setToken,
    token,
  };
}
