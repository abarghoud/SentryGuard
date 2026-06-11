import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

interface DndAccessNativeModule {
  ensureCriticalNotificationChannel(channelId: string, channelName: string): Promise<boolean>;
  isNotificationPolicyAccessGranted(): Promise<boolean>;
}

export interface DndPolicyAccessRequirements {
  ensureCriticalNotificationChannel(channelId: string, channelName: string): Promise<boolean>;
  isNotificationPolicyAccessGranted(): Promise<boolean>;
}

export class DndPolicyAccess implements DndPolicyAccessRequirements {
  private readonly nativeModule = requireOptionalNativeModule<DndAccessNativeModule>('SentryGuardDndAccess');

  public async isNotificationPolicyAccessGranted(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    return (await this.nativeModule?.isNotificationPolicyAccessGranted()) ?? false;
  }

  public async ensureCriticalNotificationChannel(channelId: string, channelName: string): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return true;
    }

    return (await this.nativeModule?.ensureCriticalNotificationChannel(channelId, channelName)) ?? false;
  }
}
