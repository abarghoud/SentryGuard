import type { JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useHaptics } from '../../../core/design/use-haptics';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon, Surface } from '../../../core/ui';
import { formatMutedUntilTime, TranslationFunction } from '../dashboard.helpers';

interface MutedBannerProps {
  isVisible: boolean;
  mutedUntil: string | null | undefined;
  onResume(): void;
  t: TranslationFunction;
}

export function MutedBanner({
  isVisible,
  mutedUntil,
  onResume,
  t,
}: MutedBannerProps): JSX.Element | null {
  const colors = useThemeColors();
  const haptics = useHaptics();

  if (!isVisible) {
    return null;
  }

  const handleResume = (): void => {
    haptics.selection();
    onResume();
  };

  const formattedTime = formatMutedUntilTime(mutedUntil, t);

  return (
    <Surface style={[styles.banner, { borderLeftColor: colors.warningBorder }]}>
      <View style={styles.heading}>
        <Icon name="bell.slash.fill" size={20} color={colors.warningBorder} />
        <AppText variant={TextVariant.Headline}>{t('dashboard.mutedBanner.title')}</AppText>
      </View>
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
        {t('dashboard.mutedBanner.text', { time: formattedTime })}
      </AppText>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" onPress={handleResume} hitSlop={8}>
          {({ pressed }) => (
            <AppText variant={TextVariant.Headline} color={colors.accent} style={pressed ? styles.pressed : null}>
              {t('dashboard.mutedBanner.resume')}
            </AppText>
          )}
        </Pressable>
      </View>
    </Surface>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    marginTop: spacing.xs,
  },
  banner: {
    borderLeftWidth: 3,
    gap: spacing.md,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.5,
  },
});
