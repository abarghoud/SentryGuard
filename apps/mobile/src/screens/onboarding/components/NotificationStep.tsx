import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useTheme } from '../../../core/theme';
import { AppSwitch, AppText } from '../../../core/ui';

interface NotificationStepProps {
  isCriticalAlertsActive: boolean;
  isCriticalAlertsTogglable: boolean;
  isPushActive: boolean;
  isTelegramLinked: boolean;
  onToggleCriticalAlerts(enabled: boolean): void;
}

export function NotificationStep({
  isCriticalAlertsActive,
  isCriticalAlertsTogglable,
  isPushActive,
  isTelegramLinked,
  onToggleCriticalAlerts,
}: NotificationStepProps): JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {isPushActive ? (
        <View style={[styles.alertBox, { backgroundColor: colors.successSurface, borderColor: colors.successBorder }]}>
          <AppText variant={TextVariant.Footnote} color={colors.systemGreen} style={styles.successText}>
            {t('onboarding.notificationsPushActive')}
          </AppText>
        </View>
      ) : isTelegramLinked ? (
        <View style={[styles.alertBox, { backgroundColor: colors.successSurface, borderColor: colors.successBorder }]}>
          <AppText variant={TextVariant.Footnote} color={colors.systemGreen} style={styles.successText}>
            {t('telegram.connected')}
          </AppText>
        </View>
      ) : (
        <AppText variant={TextVariant.Body} color={colors.secondaryLabel} style={styles.description}>
          {t('onboarding.notificationsPushDescription')}
        </AppText>
      )}

      {isPushActive ? (
        <View style={[styles.criticalCard, { borderColor: colors.separator }]}>
          <View style={styles.criticalRow}>
            <AppText variant={TextVariant.Body} style={styles.criticalLabel}>
              {t('onboarding.criticalAlerts')}
            </AppText>
            <AppSwitch
              accessibilityLabel={t('onboarding.criticalAlerts')}
              disabled={!isCriticalAlertsTogglable}
              value={isCriticalAlertsActive}
              onValueChange={onToggleCriticalAlerts}
            />
          </View>
          <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
            {t('onboarding.criticalAlertsDescription')}
          </AppText>
          {Platform.OS === 'android' ? (
            <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
              {t('onboarding.criticalAlertsAndroidVolume')}
            </AppText>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  alertBox: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    justifyContent: 'center',
    padding: spacing.md,
    width: '100%',
  },
  container: {
    gap: spacing.md,
    width: '100%',
  },
  criticalCard: {
    borderRadius: radius.control,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    width: '100%',
  },
  criticalLabel: {
    flex: 1,
  },
  criticalRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  description: {
    textAlign: 'center',
  },
  successText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
