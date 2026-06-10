import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useTheme } from '../../../core/theme';
import { AppText } from '../../../core/ui';

interface NotificationStepProps {
  isPushActive: boolean;
  isTelegramLinked: boolean;
}

export function NotificationStep({
  isPushActive,
  isTelegramLinked,
}: NotificationStepProps): JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      {isPushActive ? (
        <View style={[styles.alertBox, { backgroundColor: colors.systemGreen + '15', borderColor: colors.systemGreen + '30' }]}>
          <AppText variant={TextVariant.Footnote} color={colors.systemGreen} style={styles.successText}>
            {t('onboarding.notificationsPushActive')}
          </AppText>
        </View>
      ) : isTelegramLinked ? (
        <View style={[styles.alertBox, { backgroundColor: colors.systemGreen + '15', borderColor: colors.systemGreen + '30' }]}>
          <AppText variant={TextVariant.Footnote} color={colors.systemGreen} style={styles.successText}>
            {t('telegram.connected')}
          </AppText>
        </View>
      ) : (
        <AppText variant={TextVariant.Body} color={colors.secondaryLabel} style={styles.description}>
          {t('onboarding.notificationsPushDescription')}
        </AppText>
      )}
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
    width: '100%',
  },
  description: {
    textAlign: 'center',
  },
  successText: {
    fontWeight: '600',
    textAlign: 'center',
  },
});
