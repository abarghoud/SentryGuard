import { ThemeColors } from '../../core/theme';
import { AlertEvent, AlertEventSeverity } from '../../features/alerts/domain/entities';

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

export function resolveAlertTone(alert: AlertEvent, colors: ThemeColors): string {
  return alert.severity === AlertEventSeverity.Critical ? colors.critical : colors.warning;
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
