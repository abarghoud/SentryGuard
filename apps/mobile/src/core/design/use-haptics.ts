import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Platform } from 'react-native';

export interface HapticsApi {
  error(): void;
  impact(): void;
  selection(): void;
  success(): void;
  warning(): void;
}

const isSupported = Platform.OS === 'ios' || Platform.OS === 'android';

function run(action: () => Promise<void>): void {
  if (!isSupported) {
    return;
  }

  void action().catch(() => undefined);
}

export function useHaptics(): HapticsApi {
  return useMemo(
    () => ({
      selection: () => run(() => Haptics.selectionAsync()),
      impact: () => run(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
      success: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)),
      warning: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
      error: () => run(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)),
    }),
    []
  );
}
