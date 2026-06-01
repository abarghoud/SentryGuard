import type { JSX } from 'react';
import { Text, View } from 'react-native';

import { VehicleDetailStyles } from '../vehicle-detail.styles';
import { BetaBadge } from './BetaBadge';

export function DetailTile({
  isBeta = false,
  label,
  styles,
  value,
}: {
  isBeta?: boolean;
  label: string;
  styles: VehicleDetailStyles;
  value: string;
}): JSX.Element {
  return (
    <View style={styles.detailTile}>
      <View style={styles.labelRow}>
        <Text style={styles.tileLabel}>{label}</Text>
        {isBeta ? <BetaBadge styles={styles} /> : null}
      </View>
      <Text style={styles.tileValue}>{value}</Text>
    </View>
  );
}
