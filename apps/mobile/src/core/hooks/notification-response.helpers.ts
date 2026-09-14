import { QueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

import { muteNotificationsUseCase } from '../../features/notifications/di';
import { sessionValidator, tokenStore } from '../api';
import { appLogger } from '../logging';
import { openTeslaApp } from '../tesla-app-link';

function resolveMuteMinutes(actionIdentifier: string): number | null {
  if (actionIdentifier === 'MUTE_1H') {
    return 60;
  }
  if (actionIdentifier === 'MUTE_4H') {
    return 240;
  }
  if (actionIdentifier === 'MUTE_24H') {
    return 1440;
  }
  return null;
}

function isTeslaOpenAction(actionIdentifier: string): boolean {
  return actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER || actionIdentifier === 'OPEN_TESLA';
}

function resolveTeslaRedirectUrl(data?: Record<string, unknown>): string | null {
  return typeof data?.teslaRedirectUrl === 'string' ? data.teslaRedirectUrl : null;
}

async function ensureTokenLoaded(): Promise<void> {
  if (!tokenStore.hasToken()) {
    await tokenStore.loadFromStorage();
  }
}

async function handleMuteNotificationAction(queryClient: QueryClient, minutes: number): Promise<void> {
  Notifications.clearLastNotificationResponse();
  try {
    await ensureTokenLoaded();
    await muteNotificationsUseCase.execute(minutes);
    void queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
    appLogger.info('notifications', `Muted notifications for ${minutes}m via quick action`);
  } catch (error) {
    appLogger.error('notifications', 'Failed to mute notifications via action', error);
  }
}

async function validateSession(queryClient: QueryClient): Promise<void> {
  try {
    await sessionValidator.ensureSessionValid();
    void queryClient.invalidateQueries({ queryKey: ['alerts'] });
  } catch (error) {
    appLogger.error('api', 'Failed to validate session before notification response', error);
  }
}

async function validateAndOpenTesla(teslaRedirectUrl: string, queryClient: QueryClient): Promise<void> {
  await validateSession(queryClient);
  await openTeslaApp(teslaRedirectUrl);
}

async function handleTeslaOpenAction(
  response: Notifications.NotificationResponse,
  queryClient: QueryClient
): Promise<void> {
  const data = response.notification.request.content.data as Record<string, unknown> | undefined;
  const teslaRedirectUrl = resolveTeslaRedirectUrl(data);
  if (!teslaRedirectUrl) {
    return;
  }
  Notifications.clearLastNotificationResponse();
  await validateAndOpenTesla(teslaRedirectUrl, queryClient);
}

export async function handleAlertNotificationResponse(
  response: Notifications.NotificationResponse,
  queryClient: QueryClient
): Promise<void> {
  const muteMinutes = resolveMuteMinutes(response.actionIdentifier);
  if (muteMinutes !== null) {
    await handleMuteNotificationAction(queryClient, muteMinutes);
    return;
  }
  if (isTeslaOpenAction(response.actionIdentifier)) {
    await handleTeslaOpenAction(response, queryClient);
  }
}
