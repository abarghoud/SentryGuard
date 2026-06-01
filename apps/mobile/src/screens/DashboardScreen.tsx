import * as Linking from 'expo-linking';
import type { JSX } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, useThemeColors } from '../core/theme';
import { Vehicle } from '../features/vehicles/domain/entities';
import { useVehiclesQuery } from '../features/vehicles/di';
import { virtualKeyStore } from '../core/api';

interface DashboardScreenProps {
  isBetaTester?: boolean;
  onSelectVehicle(vehicle: Vehicle): void;
}

export function DashboardScreen({ isBetaTester = false, onSelectVehicle }: DashboardScreenProps): JSX.Element {
  const { t } = useTranslation();
  const [virtualKeyMessage, setVirtualKeyMessage] = useState<string | null>(null);
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const vehiclesQuery = useVehiclesQuery();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t('dashboard.kicker')}</Text>
        <Text style={styles.title}>{t('dashboard.title')}</Text>
        <Text style={styles.subtitle}>{resolveSubtitle(vehiclesQuery.data, isBetaTester, t)}</Text>
      </View>

      <VirtualKeyBanner
        message={virtualKeyMessage}
        styles={styles}
        t={t}
        vehicles={vehiclesQuery.data ?? []}
        onOpenKey={() => void openVirtualKey(setVirtualKeyMessage, t)}
      />

      <View style={styles.summaryRow}>
        <SummaryTile
          label={t('dashboard.monitored')}
          styles={styles}
          value={String(countProtectedVehicles(vehiclesQuery.data, isBetaTester))}
          tone={colors.accent}
        />
        <SummaryTile
          label={t('dashboard.configure')}
          styles={styles}
          value={String(countUnprotectedVehicles(vehiclesQuery.data, isBetaTester))}
          tone={colors.warning}
        />
      </View>

      <FlatList
        contentContainerStyle={styles.listContent}
        data={vehiclesQuery.data ?? []}
        keyExtractor={(vehicle) => vehicle.id}
        ListEmptyComponent={<EmptyState isLoading={vehiclesQuery.isLoading} error={vehiclesQuery.error} styles={styles} t={t} />}
        refreshControl={<RefreshControl refreshing={vehiclesQuery.isFetching} onRefresh={() => void vehiclesQuery.refetch()} />}
        renderItem={({ item }) => (
          <VehicleCard
            isBetaTester={isBetaTester}
            vehicle={item}
            onSelect={() => onSelectVehicle(item)}
            styles={styles}
            t={t}
          />
        )}
      />
    </View>
  );
}

type DashboardStyles = ReturnType<typeof createStyles>;

function VehicleCard({
  isBetaTester,
  onSelect,
  styles,
  t,
  vehicle,
}: {
  isBetaTester: boolean;
  onSelect(): void;
  styles: DashboardStyles;
  t: TranslationFunction;
  vehicle: Vehicle;
}): JSX.Element {
  const isProtected = isVehicleProtected(vehicle, isBetaTester);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View>
          <Text style={styles.vehicleName}>{vehicle.display_name ?? vehicle.model ?? t('common.vehicleFallback')}</Text>
          <Text style={styles.vin}>{vehicle.vin}</Text>
        </View>
        <View style={[styles.statusBadge, isProtected ? styles.safeBadge : styles.warningBadge]}>
          <Text style={styles.statusText}>{isProtected ? t('common.protected') : t('common.toConfigure')}</Text>
        </View>
      </View>

      <View style={styles.metrics}>
        <Metric label={t('vehicle.alertSentry')} styles={styles} value={vehicle.sentry_mode_monitoring_enabled ? t('common.active') : t('common.inactive')} />
        {isBetaTester ? (
          <Metric label={t('vehicle.alertIntrusion')} styles={styles} value={vehicle.break_in_monitoring_enabled ? t('common.active') : t('common.inactive')} />
        ) : null}
      </View>

      <Pressable accessibilityRole="button" style={styles.cardAction} onPress={onSelect}>
        <Text style={styles.cardActionText}>{t('dashboard.details')}</Text>
      </Pressable>
    </View>
  );
}

function SummaryTile({
  label,
  styles,
  tone,
  value,
}: {
  label: string;
  styles: DashboardStyles;
  tone: string;
  value: string;
}): JSX.Element {
  return (
    <View style={styles.summaryTile}>
      <Text style={[styles.summaryValue, { color: tone }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}

function Metric({ label, styles, value }: { label: string; styles: DashboardStyles; value: string }): JSX.Element {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function VirtualKeyBanner({
  message,
  onOpenKey,
  styles,
  t,
  vehicles,
}: {
  message: string | null;
  onOpenKey(): void;
  styles: DashboardStyles;
  t: TranslationFunction;
  vehicles: Vehicle[];
}): JSX.Element | null {
  if (vehicles.length === 0 || vehicles.some((vehicle) => vehicle.key_paired)) {
    return null;
  }

  return (
    <View style={styles.keyBanner}>
      <View style={styles.keyCopy}>
        <Text style={styles.keyTitle}>{t('dashboard.virtualKey.title')}</Text>
        <Text style={styles.keyText}>{t('dashboard.virtualKey.text')}</Text>
        {message ? <Text style={styles.keyMessage}>{message}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" onPress={onOpenKey} style={styles.keyButton}>
        <Text style={styles.keyButtonText}>{t('dashboard.virtualKey.open')}</Text>
      </Pressable>
    </View>
  );
}

function EmptyState({
  error,
  isLoading,
  styles,
  t,
}: {
  error: Error | null;
  isLoading: boolean;
  styles: DashboardStyles;
  t: TranslationFunction;
}): JSX.Element {
  const text = isLoading ? t('dashboard.loading') : error ? error.message : t('dashboard.empty');

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

function resolveSubtitle(vehicles: Vehicle[] | undefined, isBetaTester: boolean, t: TranslationFunction): string {
  if (!vehicles) {
    return t('dashboard.subtitleLoading');
  }

  const protectedVehicles = vehicles.filter((vehicle) => isVehicleProtected(vehicle, isBetaTester)).length;

  return t('dashboard.subtitleReady', { protectedCount: protectedVehicles, total: vehicles.length });
}

function countProtectedVehicles(vehicles: Vehicle[] | undefined, isBetaTester: boolean): number {
  return vehicles?.filter((vehicle) => isVehicleProtected(vehicle, isBetaTester)).length ?? 0;
}

function countUnprotectedVehicles(vehicles: Vehicle[] | undefined, isBetaTester: boolean): number {
  return (vehicles?.length ?? 0) - countProtectedVehicles(vehicles, isBetaTester);
}

function isVehicleProtected(vehicle: Vehicle, isBetaTester: boolean): boolean {
  return vehicle.sentry_mode_monitoring_enabled || (isBetaTester && vehicle.break_in_monitoring_enabled === true);
}

async function openVirtualKey(setMessage: (message: string | null) => void, t: TranslationFunction): Promise<void> {
  const url = virtualKeyStore.resolveUrl();

  if (!url) {
    setMessage(t('dashboard.virtualKey.missingUrl'));
    return;
  }

  await Linking.openURL(url);
  setMessage(t('dashboard.virtualKey.message'));
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    gap: 18,
    padding: 16,
  },
  cardAction: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 12,
  },
  cardActionText: {
    color: colors.text,
    fontWeight: '800',
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  container: {
    flex: 1,
  },
  empty: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    padding: 28,
  },
  emptyText: {
    color: colors.muted,
    textAlign: 'center',
  },
  header: {
    gap: 6,
    padding: 20,
    paddingBottom: 10,
  },
  kicker: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  keyBanner: {
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderColor: colors.warning,
    borderRadius: 8,
    borderWidth: 1,
    gap: 12,
    marginHorizontal: 20,
    padding: 14,
  },
  keyButton: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  keyButtonText: {
    color: colors.accentText,
    fontWeight: '900',
  },
  keyCopy: {
    gap: 4,
  },
  keyMessage: {
    color: colors.warning,
    fontSize: 12,
    lineHeight: 17,
  },
  keyText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  keyTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  listContent: {
    gap: 12,
    padding: 20,
    paddingTop: 12,
  },
  metric: {
    backgroundColor: colors.panel,
    borderRadius: 8,
    flex: 1,
    gap: 4,
    padding: 10,
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  metricValue: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  metrics: {
    flexDirection: 'row',
    gap: 8,
  },
  safeBadge: {
    backgroundColor: colors.accent,
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusText: {
    color: colors.accentText,
    fontSize: 12,
    fontWeight: '900',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
  },
  summaryLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
  },
  summaryTile: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    padding: 12,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  vehicleName: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '900',
  },
  vin: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  warningBadge: {
    backgroundColor: colors.warning,
  },
  });
}
