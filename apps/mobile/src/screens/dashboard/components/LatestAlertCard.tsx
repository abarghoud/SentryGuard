import type { JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon, Surface } from '../../../core/ui';
import { AlertEvent } from '../../../features/alerts/domain/entities';
import { resolveAlertIcon, resolveAlertTitleKey, resolveAlertTone } from '../../alerts/alerts.helpers';
import { TranslationFunction, formatRelativeAlertTime } from '../dashboard.helpers';

interface LatestAlertCardProps {
  alert: AlertEvent | null;
  isLoading: boolean;
  now: number;
  onPress(): void;
  t: TranslationFunction;
}

export function LatestAlertCard({ alert, isLoading, now, onPress, t }: LatestAlertCardProps): JSX.Element | null {
  const colors = useThemeColors();

  if (isLoading) {
    return null;
  }

  return (
    <View style={styles.section}>
      <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel} style={styles.header}>
        {t('dashboard.latestAlert.title').toUpperCase()}
      </AppText>
      {alert ? (
        <LatestAlertRow alert={alert} now={now} onPress={onPress} t={t} />
      ) : (
        <Surface style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: colors.successSurface }]}>
            <Icon name="checkmark.shield.fill" size={18} color={colors.systemGreen} />
          </View>
          <View style={styles.text}>
            <AppText variant={TextVariant.Headline}>{t('dashboard.latestAlert.emptyTitle')}</AppText>
            <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
              {t('dashboard.latestAlert.emptyText')}
            </AppText>
          </View>
        </Surface>
      )}
    </View>
  );
}

function LatestAlertRow({
  alert,
  now,
  onPress,
  t,
}: {
  alert: AlertEvent;
  now: number;
  onPress(): void;
  t: TranslationFunction;
}): JSX.Element {
  const colors = useThemeColors();
  const tone = resolveAlertTone(alert, colors);

  return (
    <Pressable accessibilityRole="button" accessibilityHint={t('dashboard.latestAlert.openHint')} onPress={onPress}>
      {({ pressed }) => (
        <Surface style={styles.row}>
          <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
            <Icon name={resolveAlertIcon(alert)} size={18} color={tone.icon} />
          </View>
          <View style={styles.text}>
            <AppText variant={TextVariant.Headline}>{t(resolveAlertTitleKey(alert))}</AppText>
            <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
              {`${alert.vehicle_display_name ?? alert.vin} · ${formatRelativeAlertTime(alert.created_at, now, t)}`}
            </AppText>
          </View>
          <Icon name="chevron.right" size={14} color={colors.secondaryLabel} weight="semibold" />
          {pressed ? (
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: colors.pressedOverlay }]} />
          ) : null}
        </Surface>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: spacing.md,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  section: {
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  text: {
    flex: 1,
    gap: 2,
  },
});
