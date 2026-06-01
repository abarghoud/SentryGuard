import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Icon, Surface } from '../../../core/ui';
import { Vehicle } from '../../../features/vehicles/domain/entities';
import { TranslationFunction } from '../dashboard.helpers';

export function VirtualKeyBanner({
  message,
  onOpenKey,
  t,
  vehicles,
}: {
  message: string | null;
  onOpenKey(): void;
  t: TranslationFunction;
  vehicles: Vehicle[];
}): JSX.Element | null {
  const colors = useThemeColors();

  if (vehicles.length === 0 || vehicles.some((vehicle) => vehicle.key_paired)) {
    return null;
  }

  return (
    <Surface style={styles.banner}>
      <View style={styles.heading}>
        <Icon name="key.fill" size={20} color={colors.systemOrange} />
        <AppText variant={TextVariant.Headline}>{t('dashboard.virtualKey.title')}</AppText>
      </View>
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
        {t('dashboard.virtualKey.text')}
      </AppText>
      {message ? (
        <AppText variant={TextVariant.Footnote} color={colors.systemOrange}>
          {message}
        </AppText>
      ) : null}
      <GlassButton label={t('dashboard.virtualKey.open')} icon="arrow.up.right.square" onPress={onOpenKey} variant={GlassButtonVariant.Secondary} />
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
