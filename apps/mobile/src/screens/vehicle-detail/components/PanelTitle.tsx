import type { JSX } from 'react';
import { Text, View } from 'react-native';

import { VehicleDetailStyles } from '../vehicle-detail.styles';
import { BetaBadge } from './BetaBadge';

export function PanelTitle({
  isBeta = false,
  styles,
  title,
}: {
  isBeta?: boolean;
  styles: VehicleDetailStyles;
  title: string;
}): JSX.Element {
  return (
    <View style={styles.labelRow}>
      <Text style={styles.panelTitle}>{title}</Text>
      {isBeta ? <BetaBadge styles={styles} /> : null}
    </View>
  );
}
