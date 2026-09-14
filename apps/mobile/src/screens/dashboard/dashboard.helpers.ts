import * as Linking from 'expo-linking';

import { virtualKeyStore } from '../../core/api';
import { Vehicle } from '../../features/vehicles/domain/entities';

export type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

export function isVehicleProtected(vehicle: Vehicle): boolean {
  return vehicle.sentry_mode_monitoring_enabled || vehicle.break_in_monitoring_enabled === true;
}

export function resolveSubtitle(vehicles: Vehicle[] | undefined, t: TranslationFunction): string {
  if (!vehicles) {
    return t('dashboard.subtitleLoading');
  }

  const protectedVehicles = vehicles.filter((vehicle) => isVehicleProtected(vehicle)).length;

  return t('dashboard.subtitleReady', { protectedCount: protectedVehicles, total: vehicles.length });
}

export async function openVirtualKey(setMessage: (message: string | null) => void, t: TranslationFunction): Promise<void> {
  const url = virtualKeyStore.resolveUrl();

  if (!url) {
    setMessage(t('dashboard.virtualKey.missingUrl'));
    return;
  }

  await Linking.openURL(url);
  setMessage(t('dashboard.virtualKey.message'));
}

export function isMuteActive(mutedUntil: string | null | undefined): boolean {
  if (!mutedUntil) {
    return false;
  }

  const timestamp = new Date(mutedUntil).getTime();
  return !isNaN(timestamp) && timestamp > Date.now();
}

export function formatMutedUntilTime(
  mutedUntil: string | null | undefined,
  t?: TranslationFunction
): string {
  if (!mutedUntil) {
    return '';
  }
  const date = new Date(mutedUntil);
  if (isNaN(date.getTime())) {
    return '';
  }
  return formatMutedDateWithDay(date, t);
}

function formatMutedDateWithDay(date: Date, t?: TranslationFunction): string {
  const time = formatHoursMinutes(date);
  const diffDays = resolveDayDifference(date);
  if (diffDays === 1) {
    return t ? t('common.tomorrowAt', { time }) : `demain à ${time}`;
  }
  if (diffDays > 1) {
    return formatFutureDate(date, time, t);
  }
  return time;
}

function formatHoursMinutes(date: Date): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function resolveDayDifference(targetDate: Date): number {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const target = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
  return Math.round((target - today) / 86400000);
}

function formatFutureDate(date: Date, time: string, t?: TranslationFunction): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const dateStr = `${day}/${month}`;
  return t ? t('common.dateAtTime', { date: dateStr, time }) : `${dateStr} à ${time}`;
}
