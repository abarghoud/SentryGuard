import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

import { appLogger } from '../logging';
import {
  pushNotificationService,
} from '../../features/notifications/di';

interface PushTokenResult {
  isTokenResolved: boolean;
  pushToken: string | null;
  setPushToken: React.Dispatch<React.SetStateAction<string | null>>;
}

export function usePushToken(): PushTokenResult {
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isTokenResolved, setIsTokenResolved] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    let isActive = true;

    const syncPushToken = async () => {
      try {
        const cachedToken = await pushNotificationService.getCachedExpoPushToken();
        const freshToken = await pushNotificationService.getGrantedExpoPushToken();

        if (freshToken) {
          if (isActive) {
            setPushToken(freshToken);
          }
          appLogger.info('push', `Push token resolved (…${freshToken.slice(-8)})`);
          if (isActive) {
            void queryClient.invalidateQueries({ queryKey: ['notification-preferences', freshToken] });
          }
        } else if (cachedToken) {
          if (isActive) {
            setPushToken(null);
          }
          appLogger.warn('push', 'Push permission missing, disabling push in local state');
        }
      } catch (error) {
        appLogger.error('push', 'Push token sync failed', error instanceof Error ? error.message : error);
      } finally {
        if (isActive) {
          setIsTokenResolved(true);
        }
      }
    };

    void syncPushToken();

    return () => {
      isActive = false;
    };
  }, [queryClient]);

  return {
    isTokenResolved,
    pushToken,
    setPushToken,
  };
}
