import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon } from '../../../core/ui';
import { TranslationFunction } from '../dashboard.helpers';

export function EmptyState({ error, isLoading, t }: { error: Error | null; isLoading: boolean; t: TranslationFunction }): JSX.Element {
  const colors = useThemeColors();
  const text = isLoading ? t('dashboard.loading') : error ? error.message : t('dashboard.empty');

  return (
    <View style={styles.empty}>
      <Icon name="car.2.fill" size={42} color={colors.tertiaryLabel} />
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel} style={styles.text}>
        {text}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl * 2,
  },
  text: {
    textAlign: 'center',
  },
});
