import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { i18n } from '../../../core/i18n';
import { lightColors } from '../../../core/theme';
import { DndPolicyAccessRequirements } from './dnd-policy-access';

export interface PushNotificationServiceRequirements {
  clearCachedExpoPushToken(): Promise<void>;
  configure(): Promise<void>;
  getCachedExpoPushToken(): Promise<string | null>;
  getGrantedExpoPushToken(): Promise<string | null>;
  requestExpoPushToken(): Promise<string | null>;
}

export class PushNotificationService implements PushNotificationServiceRequirements {
  private readonly notificationChannelId = 'sentryguard-alerts';
  private readonly criticalNotificationChannelId = 'sentryguard-critical-alerts-v5';
  private readonly pushTokenStorageKey = 'sentryguard.expoPushToken';

  public constructor(private readonly dndPolicyAccess: DndPolicyAccessRequirements) {}

  public async getCachedExpoPushToken(): Promise<string | null> {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem(this.pushTokenStorageKey) ?? null;
    }

    return SecureStore.getItemAsync(this.pushTokenStorageKey);
  }

  public async clearCachedExpoPushToken(): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.removeItem(this.pushTokenStorageKey);
      return;
    }

    await SecureStore.deleteItemAsync(this.pushTokenStorageKey);
  }

  private async storeExpoPushToken(token: string): Promise<void> {
    if (Platform.OS === 'web') {
      globalThis.localStorage?.setItem(this.pushTokenStorageKey, token);
      return;
    }

    await SecureStore.setItemAsync(this.pushTokenStorageKey, token);
  }

  public async configure(): Promise<void> {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        priority: Notifications.AndroidNotificationPriority.HIGH,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowAlert: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    if (Platform.OS === 'android') {
      await this.configureAndroidChannels();
    }
  }

  public async requestExpoPushToken(): Promise<string | null> {
    if (Platform.OS === 'web' || !Device.isDevice) {
      return null;
    }

    const finalStatus = await this.resolvePermissionStatus();

    if (finalStatus !== 'granted') {
      return null;
    }

    return this.getExpoPushToken();
  }

  public async getGrantedExpoPushToken(): Promise<string | null> {
    if (Platform.OS === 'web' || !Device.isDevice) {
      return null;
    }

    const permissions = await Notifications.getPermissionsAsync();
    return permissions.granted ? this.getExpoPushToken() : null;
  }

  private async configureAndroidChannels(): Promise<void> {
    await Promise.all([
      Notifications.setNotificationChannelAsync(this.notificationChannelId, {
        importance: Notifications.AndroidImportance.HIGH,
        lightColor: lightColors.systemGreen,
        name: i18n.t('notifications.channelName'),
        vibrationPattern: [0, 250, 250, 250],
      }),
      this.configureCriticalNotificationChannel(),
    ]);
  }

  private async configureCriticalNotificationChannel(): Promise<void> {
    if (!(await this.dndPolicyAccess.isNotificationPolicyAccessGranted())) {
      return;
    }

    await this.dndPolicyAccess.ensureCriticalNotificationChannel(
      this.criticalNotificationChannelId,
      i18n.t('notifications.criticalChannelName')
    );
  }

  private async resolvePermissionStatus(): Promise<string> {
    const permissions = await Notifications.getPermissionsAsync();
    const requestedPermissions = permissions.granted
      ? permissions
      : await Notifications.requestPermissionsAsync();

    return requestedPermissions.status;
  }

  private async getExpoPushToken(): Promise<string | null> {
    try {
      const projectId = this.getEasProjectId();
      const expoToken = projectId
        ? await Notifications.getExpoPushTokenAsync({ projectId })
        : await Notifications.getExpoPushTokenAsync();

      await this.storeExpoPushToken(expoToken.data);
      return expoToken.data;
    } catch (error) {
      throw new Error(this.resolvePushTokenErrorMessage(error));
    }
  }

  private getEasProjectId(): string | undefined {
    const extra = Constants.expoConfig?.extra;

    if (this.isExpoExtra(extra)) {
      return extra.eas?.projectId;
    }

    return Constants.easConfig?.projectId;
  }

  private isExpoExtra(extra: unknown): extra is { eas?: { projectId?: string } } {
    return typeof extra === 'object' && extra !== null && 'eas' in extra;
  }

  private resolvePushTokenErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
