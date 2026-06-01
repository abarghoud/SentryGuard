import type { JSX } from 'react';
import { Pressable, Text } from 'react-native';

import { OnboardingStyles } from '../onboarding.styles';

export function SecondaryButton({
  disabled,
  label,
  onPress,
  styles,
}: {
  disabled?: boolean;
  label: string;
  onPress(): void;
  styles: OnboardingStyles;
}): JSX.Element {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.secondaryButton, disabled ? styles.disabled : null]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}
