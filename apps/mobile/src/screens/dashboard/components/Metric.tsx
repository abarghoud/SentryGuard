import type { JSX } from 'react';
import { Text, View } from 'react-native';

import { DashboardStyles } from '../dashboard.styles';

export function Metric({ label, styles, value }: { label: string; styles: DashboardStyles; value: string }): JSX.Element {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}
