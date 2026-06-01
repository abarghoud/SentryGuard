import type { JSX } from 'react';
import { Pressable, Text, View } from 'react-native';

import { VehicleDetailStyles } from '../vehicle-detail.styles';

export function LockedSetting({
  description,
  disabled,
  label,
  onPress,
  styles,
  title,
}: {
  description: string;
  disabled: boolean;
  label: string;
  onPress(): void;
  styles: VehicleDetailStyles;
  title: string;
}): JSX.Element {
  return (
    <View style={styles.lockedPanel}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleDescription}>{description}</Text>
      </View>
      <Pressable disabled={disabled} onPress={onPress} style={[styles.lockedButton, disabled ? styles.disabledAction : null]}>
        <Text style={styles.lockedButtonText}>{label}</Text>
      </Pressable>
    </View>
  );
}
