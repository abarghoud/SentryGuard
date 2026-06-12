import * as Linking from 'expo-linking';
import { Alert, Platform } from 'react-native';

import { virtualKeyStore } from '../../core/api';
import { buildAppUrl } from '../../core/config/app-domain';
import { dndPolicyAccess, pushNotificationService, registerPushTokenUseCase } from '../../features/notifications/di';
import { NotificationPreferences } from '../../features/notifications/domain/entities';

export const defaultPreferences: NotificationPreferences = {
  critical_alerts_enabled: false,
  critical_only: false,
  push_enabled: false,
  telegram_enabled: true,
};

export function resolvePreferenceUpdates(updates: Partial<NotificationPreferences>): Partial<NotificationPreferences> {
  if (updates.push_enabled === false) {
    return { ...updates, critical_alerts_enabled: false };
  }

  return updates;
}

export function requiresPushDevice(updates: Partial<NotificationPreferences>): boolean {
  return (
    updates.push_enabled !== undefined ||
    updates.critical_only !== undefined ||
    updates.critical_alerts_enabled !== undefined
  );
}

export async function registerDeviceForPush(
  setMessage: ((message: string | null) => void) | undefined,
  t: (key: string) => string
): Promise<string | null> {
  const token = await pushNotificationService.requestExpoPushToken();
  if (!token) {
    setMessage?.(Platform.OS === 'web' ? t('settings.pushNativeOnly') : t('settings.pushPermissionDenied'));
    return null;
  }

  await registerPushTokenUseCase.execute(token, Platform.OS);
  return token;
}

export async function canEnableCriticalAlerts(setIsDndAccessModalOpen: (isOpen: boolean) => void): Promise<boolean> {
  const hasAccess = await dndPolicyAccess.isNotificationPolicyAccessGranted();

  if (hasAccess) {
    await pushNotificationService.configure();
    return true;
  }

  setIsDndAccessModalOpen(true);
  return false;
}

export async function openAndroidDoNotDisturbAccessSettings(
  setIsDndAccessModalOpen: (isOpen: boolean) => void
): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  setIsDndAccessModalOpen(false);
  await Linking.sendIntent('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
}

export function resolveSettingsError(error: unknown, t: (key: string) => string): string {
  return error instanceof Error ? error.message : t('settings.error');
}

const donationUrl = 'https://buymeacoffee.com/sentryguardorg';

export async function openDonation(): Promise<void> {
  await Linking.openURL(donationUrl);
}

const fallbackDomain = 'sentryguard.org';

function resolveLegalLocalePath(locale: string): string {
  return locale.startsWith('fr') ? 'fr' : 'en';
}

function buildLegalUrl(locale: string, page: 'privacy' | 'terms'): string {
  const domain = virtualKeyStore.resolveDomain() || fallbackDomain;
  return buildAppUrl(domain, `/${resolveLegalLocalePath(locale)}/legal/${page}`);
}

export async function openPrivacyPolicy(locale: string): Promise<void> {
  await Linking.openURL(buildLegalUrl(locale, 'privacy'));
}

export async function openTermsOfService(locale: string): Promise<void> {
  await Linking.openURL(buildLegalUrl(locale, 'terms'));
}

export function confirmAccountDeletion(onConfirm: () => void, t: (key: string) => string): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(t('settings.deleteAccountConfirm'))) {
      onConfirm();
    }

    return;
  }

  Alert.alert(t('settings.deleteAccountTitle'), t('settings.deleteAccountConfirm'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('settings.deleteAccountCta'), style: 'destructive', onPress: onConfirm },
  ]);
}
