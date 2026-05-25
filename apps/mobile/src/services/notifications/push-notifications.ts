import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { i18n } from '../../core/i18n';
import { ensureCriticalNotificationChannel, isNotificationPolicyAccessGranted } from './dnd-policy-access';

const notificationChannelId = 'sentryguard-alerts';
const criticalNotificationChannelId = 'sentryguard-critical-alerts-v5';

export async function configurePushNotifications(): Promise<void> {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      priority: Notifications.AndroidNotificationPriority.HIGH,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowAlert: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Promise.all([
      Notifications.setNotificationChannelAsync(notificationChannelId, {
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: '#10b981',
        name: i18n.t('notifications.channelName'),
        vibrationPattern: [0, 250, 250, 250],
      }),
      configureCriticalNotificationChannel(),
    ]);
  }
}

async function configureCriticalNotificationChannel(): Promise<void> {
  if (!(await isNotificationPolicyAccessGranted())) {
    return;
  }

  await ensureCriticalNotificationChannel(criticalNotificationChannelId, i18n.t('notifications.criticalChannelName'));
}

export async function requestExpoPushToken(): Promise<string | null> {
  if (Platform.OS === 'web' || !Device.isDevice) {
    return null;
  }

  const permissions = await Notifications.getPermissionsAsync();
  const requestedPermissions = permissions.granted
    ? permissions
    : await Notifications.requestPermissionsAsync();
  const finalStatus = requestedPermissions.status;

  if (finalStatus !== 'granted') {
    return null;
  }

  try {
    const projectId = getEasProjectId();
    const expoToken = projectId
      ? await Notifications.getExpoPushTokenAsync({ projectId })
      : await Notifications.getExpoPushTokenAsync();

    return expoToken.data;
  } catch (error) {
    throw new Error(resolvePushTokenErrorMessage(error));
  }
}

function getEasProjectId(): string | undefined {
  const extra = Constants.expoConfig?.extra;

  if (isExpoExtra(extra)) {
    return extra.eas?.projectId;
  }

  return Constants.easConfig?.projectId;
}

function isExpoExtra(extra: unknown): extra is { eas?: { projectId?: string } } {
  return typeof extra === 'object' && extra !== null && 'eas' in extra;
}

function resolvePushTokenErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}
