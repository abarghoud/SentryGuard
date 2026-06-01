import type { JSX } from 'react';
import { Text, View } from 'react-native';

import { SettingsStyles } from '../settings.styles';
import { ToggleSwitch } from './ToggleSwitch';

export function PreferenceRow({
  description,
  disabled,
  isNested = false,
  label,
  onValueChange,
  styles,
  value,
}: {
  description?: string;
  disabled: boolean;
  isNested?: boolean;
  label: string;
  onValueChange(value: boolean): void;
  styles: SettingsStyles;
  value: boolean;
}): JSX.Element {
  return (
    <View
      style={[
        styles.preferenceRow,
        description ? styles.describedPreferenceRow : null,
        isNested ? styles.nestedPreferenceRow : null,
        disabled ? styles.disabledPreferenceRow : null,
      ]}
    >
      <View style={styles.preferenceText}>
        <Text style={[styles.rowValue, isNested ? styles.nestedRowValue : null, disabled ? styles.disabledRowValue : null]}>{label}</Text>
        {description ? <Text style={styles.rowLabel}>{description}</Text> : null}
      </View>
      <ToggleSwitch disabled={disabled} isOn={value} onToggle={() => onValueChange(!value)} styles={styles} />
    </View>
  );
}
