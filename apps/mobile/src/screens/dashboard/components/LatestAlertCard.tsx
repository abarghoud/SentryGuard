import type { JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon, Surface } from '../../../core/ui';
import { AlertEvent } from '../../../features/alerts/domain/entities';
import { resolveAlertError, resolveAlertIcon, resolveAlertTitleKey, resolveAlertTone } from '../../alerts/alerts.helpers';
import { TranslationFunction, formatRelativeAlertTime } from '../dashboard.helpers';

interface LatestAlertCardProps {
  alert: AlertEvent | null;
  error: Error | null;
  isLoading: boolean;
  now: number;
  onPress(): void;
  t: TranslationFunction;
}

interface LatestAlertRowProps {
  alert: AlertEvent;
  now: number;
  onPress(): void;
  t: TranslationFunction;
}

interface LatestAlertStatusRowProps {
  iconBackground: string;
  iconColor: string;
  iconName: 'checkmark.shield.fill' | 'exclamationmark.triangle.fill';
  text: string;
  title: string;
}

export function LatestAlertCard({ alert, error, isLoading, now, onPress, t }: LatestAlertCardProps): JSX.Element | null {
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
      ) : error ? (
        <LatestAlertStatusRow
          iconBackground={colors.warningFill}
          iconColor={colors.onWarning}
          iconName="exclamationmark.triangle.fill"
          text={resolveAlertError(error, t)}
          title={t('dashboard.latestAlert.errorTitle')}
        />
      ) : (
        <LatestAlertStatusRow
          iconBackground={colors.successSurface}
          iconColor={colors.systemGreen}
          iconName="checkmark.shield.fill"
          text={t('dashboard.latestAlert.emptyText')}
          title={t('dashboard.latestAlert.emptyTitle')}
        />
      )}
    </View>
  );
}

function LatestAlertStatusRow({ iconBackground, iconColor, iconName, text, title }: LatestAlertStatusRowProps): JSX.Element {
  const colors = useThemeColors();

  return (
    <Surface style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: iconBackground }]}>
        <Icon name={iconName} size={18} color={iconColor} />
      </View>
      <View style={styles.text}>
        <AppText variant={TextVariant.Headline}>{title}</AppText>
        <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
          {text}
        </AppText>
      </View>
    </Surface>
  );
}

function LatestAlertRow({ alert, now, onPress, t }: LatestAlertRowProps): JSX.Element {
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
