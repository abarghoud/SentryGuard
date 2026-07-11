import type { JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useHaptics } from '../../../core/design/use-haptics';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon, Surface } from '../../../core/ui';
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
  const haptics = useHaptics();

  if (!isVisible) {
    return null;
  }

  const handleEnable = (): void => {
    haptics.selection();
    onEnable();
  };

  const handleDismiss = (): void => {
    haptics.selection();
    onDismiss();
  };

  return (
    <Surface style={[styles.banner, { borderLeftColor: colors.systemRed }]}>
      <View style={styles.heading}>
        <Icon name="bell.badge.fill" size={20} color={colors.systemRed} />
        <AppText variant={TextVariant.Headline}>{t('dashboard.pushBanner.title')}</AppText>
      </View>
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
        {t('dashboard.pushBanner.text')}
      </AppText>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={handleEnable} hitSlop={8}>
          {({ pressed }) => (
            <AppText variant={TextVariant.Headline} color={colors.accent} style={pressed ? styles.pressed : null}>
              {t('dashboard.pushBanner.enable')}
            </AppText>
          )}
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleDismiss} hitSlop={8}>
          {({ pressed }) => (
            <AppText variant={TextVariant.Headline} color={colors.secondaryLabel} style={pressed ? styles.pressed : null}>
              {t('dashboard.pushBanner.dismiss')}
            </AppText>
          )}
        </Pressable>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  banner: {
    borderLeftWidth: 3,
    gap: spacing.md,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    marginTop: spacing.xs,
  },
  pressed: {
    opacity: 0.5,
  },
});
