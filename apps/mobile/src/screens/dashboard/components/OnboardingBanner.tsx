import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Icon, Surface } from '../../../core/ui';
import { TranslationFunction } from '../dashboard.helpers';

export function OnboardingBanner({
  isVisible,
  onResume,
  t,
}: {
  isVisible: boolean;
  onResume(): void;
  t: TranslationFunction;
}): JSX.Element | null {
  const colors = useThemeColors();

  if (!isVisible) {
    return null;
  }

  return (
    <Surface style={styles.banner}>
      <View style={styles.heading}>
        <Icon name="exclamationmark.triangle.fill" size={20} color={colors.secondaryLabel} />
        <AppText variant={TextVariant.Headline}>{t('dashboard.onboardingIncomplete.title')}</AppText>
      </View>
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
        {t('dashboard.onboardingIncomplete.text')}
      </AppText>
      <GlassButton
        label={t('dashboard.onboardingIncomplete.resume')}
        icon="chevron.right"
        onPress={onResume}
        variant={GlassButtonVariant.Secondary}
      />
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
});
