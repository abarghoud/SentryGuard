import { Alert, Platform } from 'react-native';

import { ThemeColors } from '../../core/theme';
import { AlertEvent, AlertEventSeverity } from '../../features/alerts/domain/entities';

type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

export enum AlertFilter {
  All = 'all',
  Critical = 'critical',
  Warning = 'warning',
}

export function filterAlerts(alerts: AlertEvent[], activeFilter: AlertFilter): AlertEvent[] {
  if (activeFilter === AlertFilter.Critical) {
    return alerts.filter((alert) => alert.severity === AlertEventSeverity.Critical);
  }

  if (activeFilter === AlertFilter.Warning) {
    return alerts.filter((alert) => alert.severity === AlertEventSeverity.Warning);
  }

  return alerts;
}

export interface AlertIconTone {
  background: string;
  icon: string;
}

export function resolveAlertTone(alert: AlertEvent, colors: ThemeColors): AlertIconTone {
  if (alert.severity === AlertEventSeverity.Critical) {
    return { background: colors.criticalFill, icon: colors.onCritical };
  }

  return { background: colors.warningFill, icon: colors.onWarning };
}

export function resolveAlertIcon(alert: AlertEvent): 'exclamationmark.triangle.fill' | 'bell.badge.fill' {
  return alert.severity === AlertEventSeverity.Critical ? 'exclamationmark.triangle.fill' : 'bell.badge.fill';
}

export function formatAlertDate(value: string, language: string): string {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'fr-FR', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: '2-digit',
  }).format(new Date(value));
}

export function resolveAlertError(error: unknown, t: (key: string) => string): string {
  return error instanceof Error ? error.message : t('alerts.error');
}

export function resolveFilterLabelKey(filter: AlertFilter): string {
  return `alerts.filter.${filter}`;
}

export function resolveAlertTitleKey(alert: AlertEvent): string {
  return `alerts.event.${alert.type}.title`;
}

export function resolveAlertMessageKey(alert: AlertEvent): string {
  return `alerts.event.${alert.type}.message`;
}

export function isAlertUnread(alert: AlertEvent, lastSeenAt: string | null): boolean {
  if (!lastSeenAt) {
    return true;
  }

  return new Date(alert.created_at).getTime() > new Date(lastSeenAt).getTime();
}

export function countUnreadAlerts(alerts: AlertEvent[], lastSeenAt: string | null): number {
  return alerts.filter((alert) => isAlertUnread(alert, lastSeenAt)).length;
}

export function confirmClearAlerts(alertCount: number, onConfirm: () => void, t: TranslationFunction): void {
  if (Platform.OS === 'web') {
    if (globalThis.confirm(t('alerts.clearConfirmMessage', { count: alertCount }))) {
      onConfirm();
    }

    return;
  }

  Alert.alert(t('alerts.clearConfirmTitle'), t('alerts.clearConfirmMessage', { count: alertCount }), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('alerts.clear'), style: 'destructive', onPress: onConfirm },
  ]);
}
