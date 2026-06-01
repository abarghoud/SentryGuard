import type { JSX } from 'react';
import { Text, View } from 'react-native';

import { TranslationFunction } from '../dashboard.helpers';
import { DashboardStyles } from '../dashboard.styles';

export function EmptyState({
  error,
  isLoading,
  styles,
  t,
}: {
  error: Error | null;
  isLoading: boolean;
  styles: DashboardStyles;
  t: TranslationFunction;
}): JSX.Element {
  const text = isLoading ? t('dashboard.loading') : error ? error.message : t('dashboard.empty');

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}
