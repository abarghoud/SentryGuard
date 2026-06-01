import type { JSX } from 'react';
import { Text, View } from 'react-native';

import { DashboardStyles } from '../dashboard.styles';

export function SummaryTile({
  label,
  styles,
  tone,
  value,
}: {
  label: string;
  styles: DashboardStyles;
  tone: string;
  value: string;
}): JSX.Element {
  return (
    <View style={styles.summaryTile}>
      <Text style={[styles.summaryValue, { color: tone }]}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </View>
  );
}
