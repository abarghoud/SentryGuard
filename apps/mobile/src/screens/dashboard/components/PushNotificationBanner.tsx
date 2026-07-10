import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Icon, Surface } from '../../../core/ui';
import { TranslationFunction } from '../dashboard.helpers';

export function PushNotificationBanner({
  isVisible,
  onEnable,
  onDismiss,
  t,
}: {
  isVisible: boolean;
  onEnable(): void;
  onDismiss(): void;
  t: TranslationFunction;
}): JSX.Element | null {
  const colors = useThemeColors();

  if (!isVisible) {
    return null;
  }

  return (
    <Surface style={styles.banner}>
      <View style={styles.heading}>
        <Icon name="bell.badge.fill" size={20} color={colors.systemRed} />
        <AppText variant={TextVariant.Headline}>{t('dashboard.pushBanner.title')}</AppText>
      </View>
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
        {t('dashboard.pushBanner.text')}
      </AppText>
      <View style={styles.actions}>
        <GlassButton
          label={t('dashboard.pushBanner.enable')}
          icon="bell.fill"
          onPress={onEnable}
          variant={GlassButtonVariant.Secondary}
        />
        <GlassButton
          label={t('dashboard.pushBanner.dismiss')}
          onPress={onDismiss}
          variant={GlassButtonVariant.Plain}
        />
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  banner: {
    gap: spacing.md,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    gap: spacing.xs,
  },
});
