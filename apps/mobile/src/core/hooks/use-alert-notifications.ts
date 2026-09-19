import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';

import { handleAlertNotificationResponse } from './notification-response.helpers';

export function useAlertNotifications(): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    const onAlertNotification = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    };
    const onAlertNotificationResponse = (response: Notifications.NotificationResponse): void => {
      void handleAlertNotificationResponse(response, queryClient);
    };

    const receivedSubscription = Notifications.addNotificationReceivedListener(onAlertNotification);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onAlertNotificationResponse);
    const lastResponse = Notifications.getLastNotificationResponse();

    if (lastResponse) {
      void handleAlertNotificationResponse(lastResponse, queryClient);
    }

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [queryClient]);
}
