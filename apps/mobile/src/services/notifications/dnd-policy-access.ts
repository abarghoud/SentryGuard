import { NativeModules, Platform } from 'react-native';

interface DndAccessNativeModule {
  ensureCriticalNotificationChannel(channelId: string, channelName: string): Promise<boolean>;
  isNotificationPolicyAccessGranted(): Promise<boolean>;
}

const nativeModules = NativeModules as {
  SentryGuardDndAccess?: DndAccessNativeModule;
};

export async function isNotificationPolicyAccessGranted(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  return await nativeModules.SentryGuardDndAccess?.isNotificationPolicyAccessGranted() ?? false;
}

export async function ensureCriticalNotificationChannel(channelId: string, channelName: string): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  return await nativeModules.SentryGuardDndAccess?.ensureCriticalNotificationChannel(channelId, channelName) ?? false;
}
