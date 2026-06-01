import type { JSX } from 'react';
import { Text, View } from 'react-native';

import { SettingsStyles } from '../settings.styles';

export function SettingRow({ label, styles, value }: { label: string; styles: SettingsStyles; value: string }): JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}
