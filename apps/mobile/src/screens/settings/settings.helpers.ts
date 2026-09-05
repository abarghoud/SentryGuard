import * as Linking from 'expo-linking';
import * as Sharing from 'expo-sharing';
import * as WebBrowser from 'expo-web-browser';
import { Alert, Platform, Share } from 'react-native';

import { virtualKeyStore } from '../../core/api';
import { buildAppUrl } from '../../core/config/app-domain';
import { appLogger, buildLogsExportFileName, writeLogsExportFile } from '../../core/logging';
import { dndPolicyAccess, pushNotificationService, registerPushTokenUseCase } from '../../features/notifications/di';
import { NotificationPreferences } from '../../features/notifications/domain/entities';

export const defaultPreferences: NotificationPreferences = {
  alert_sound: 'sentry_siren.wav',
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

export async function resolveAvailablePushToken(
  currentPushToken: string | null,
  updates: Partial<NotificationPreferences>,
  getCachedPushToken = () => pushNotificationService.getCachedExpoPushToken()
): Promise<string | undefined> {
  if (currentPushToken) {
    return currentPushToken;
  }

  if (updates.push_enabled === false) {
    return (await getCachedPushToken()) ?? undefined;
  }

  return undefined;
}

export async function registerDeviceForPush(
  setMessage: ((message: string | null) => void) | undefined,
  t: (key: string) => string
): Promise<string | null> {
  const token = await pushNotificationService.requestExpoPushToken();
  if (!token) {
    appLogger.warn('push', 'Push registration aborted: no token (permission denied or unsupported device)');
    setMessage?.(Platform.OS === 'web' ? t('settings.pushNativeOnly') : t('settings.pushPermissionDenied'));
    return null;
  }

  await registerPushTokenUseCase.execute(token, Platform.OS);
  appLogger.info('push', `Push device registered (…${token.slice(-8)})`);
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

export function resolveFaqUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_FAQ_URL?.trim();
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

export async function openFaq(): Promise<void> {
  const url = resolveFaqUrl();
  if (!url) {
    return;
  }
  if (Platform.OS === 'web') {
    globalThis.open?.(url, '_blank');
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

export function resolveCrispWebsiteId(): string | undefined {
  const id = process.env.EXPO_PUBLIC_CRISP_WEBSITE_ID?.trim();
  return id && /^[a-zA-Z0-9-]+$/.test(id) ? id : undefined;
}

export function resolveDiscordUrl(): string | undefined {
  const url = process.env.EXPO_PUBLIC_DISCORD_URL?.trim();
  return url && /^https?:\/\//i.test(url) ? url : undefined;
}

export function resolveSupportEmail(): string | undefined {
  const email = process.env.EXPO_PUBLIC_SUPPORT_EMAIL?.trim();
  return email && email.includes('@') && !/[\r\n]/.test(email) ? email : undefined;
}

export function buildCrispChatUrl(userEmail?: string, userName?: string): string | null {
  const websiteId = resolveCrispWebsiteId();
  if (!websiteId) {
    return null;
  }
  const params = new URLSearchParams({ website_id: websiteId });
  if (userEmail) {
    params.set('user_email', userEmail);
  }
  if (userName) {
    params.set('user_nickname', userName);
  }
  return `https://go.crisp.chat/chat/embed/?${params.toString()}`;
}

export async function openCrispSupport(userEmail?: string, userName?: string): Promise<void> {
  const url = buildCrispChatUrl(userEmail, userName);
  if (!url) {
    return;
  }
  if (Platform.OS === 'web') {
    globalThis.open?.(url, '_blank');
    return;
  }
  await WebBrowser.openBrowserAsync(url);
}

export async function openDiscordCommunity(): Promise<void> {
  const url = resolveDiscordUrl();
  if (!url) {
    return;
  }
  await Linking.openURL(url);
}

export async function openEmailSupport(subject = 'Support SentryGuard'): Promise<void> {
  const email = resolveSupportEmail();
  if (!email) {
    return;
  }
  await Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}`);
}

export async function shareDebugLogs(t: (key: string) => string): Promise<void> {
  try {
    await presentDebugLogs(await appLogger.exportLogs(), t);
  } catch {
    return;
  }
}

export async function clearDebugLogs(): Promise<void> {
  await appLogger.clear();
}

async function presentDebugLogs(logs: string, t: (key: string) => string): Promise<void> {
  if (Platform.OS === 'web') {
    downloadLogsOnWeb(logs, t);
    return;
  }

  if (!(await Sharing.isAvailableAsync())) {
    await Share.share({ message: logs }, { dialogTitle: 'SentryGuard debug logs', subject: 'SentryGuard debug logs' });
    return;
  }

  await Sharing.shareAsync(writeLogsExportFile(logs), {
    UTI: 'public.plain-text',
    dialogTitle: 'SentryGuard debug logs',
    mimeType: 'text/plain',
  });
}

function downloadLogsOnWeb(logs: string, t: (key: string) => string): void {
  const anchor = globalThis.document?.createElement('a');
  if (!anchor) {
    void globalThis.navigator?.clipboard?.writeText(logs);
    globalThis.alert?.(t('settings.logsCopied'));
    return;
  }

  const blobUrl = URL.createObjectURL(new Blob([logs], { type: 'text/plain' }));
  anchor.href = blobUrl;
  anchor.download = buildLogsExportFileName();
  anchor.click();
  URL.revokeObjectURL(blobUrl);
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
