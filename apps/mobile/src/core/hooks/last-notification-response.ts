import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export function getLastNotificationResponse(): Notifications.NotificationResponse | null {
  if (Platform.OS === 'web') {
    return null;
  }

  return Notifications.getLastNotificationResponse();
}
