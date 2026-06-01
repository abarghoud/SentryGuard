import type { JSX } from 'react';
import { Pressable, Text, View } from 'react-native';

import { VehicleDetailStyles } from '../vehicle-detail.styles';
import { BetaBadge } from './BetaBadge';

export function ToggleSetting({
  description,
  disabled,
  isBeta = false,
  isOn,
  label,
  onToggle,
  styles,
}: {
  description: string;
  disabled: boolean;
  isBeta?: boolean;
  isOn: boolean;
  label: string;
  onToggle(): void;
  styles: VehicleDetailStyles;
}): JSX.Element {
  return (
    <View style={styles.togglePanel}>
      <View style={styles.toggleCopy}>
        <View style={styles.labelRow}>
          <Text style={styles.toggleTitle}>{label}</Text>
          {isBeta ? <BetaBadge styles={styles} /> : null}
        </View>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: isOn }}
        disabled={disabled}
        onPress={onToggle}
        style={[
          styles.toggleTrack,
          isOn ? styles.toggleTrackOn : styles.toggleTrackOff,
          disabled ? styles.disabledAction : null,
        ]}
      >
        <View style={[styles.toggleThumb, isOn ? styles.toggleThumbOn : styles.toggleThumbOff]} />
      </Pressable>
    </View>
  );
}
