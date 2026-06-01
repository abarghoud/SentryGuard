import type { JSX } from 'react';
import { Pressable, View } from 'react-native';

import { SettingsStyles } from '../settings.styles';

export function ToggleSwitch({
  disabled,
  isOn,
  onToggle,
  styles,
}: {
  disabled: boolean;
  isOn: boolean;
  onToggle(): void;
  styles: SettingsStyles;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn }}
      disabled={disabled}
      onPress={onToggle}
      style={[styles.toggleTrack, isOn ? styles.toggleTrackOn : styles.toggleTrackOff, disabled ? styles.disabledSwitch : null]}
    >
      <View style={[styles.toggleThumb, isOn ? styles.toggleThumbOn : styles.toggleThumbOff]} />
    </Pressable>
  );
}
