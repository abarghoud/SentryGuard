import type { JSX } from 'react';
import { Pressable, Text } from 'react-native';

import { SettingsStyles } from '../settings.styles';

export function ThemeOption({
  isActive,
  label,
  onPress,
  styles,
}: {
  isActive: boolean;
  label: string;
  onPress(): void;
  styles: SettingsStyles;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={[styles.themeOption, isActive ? styles.activeThemeOption : null]}
    >
      <Text style={[styles.themeOptionText, isActive ? styles.activeThemeOptionText : null]}>{label}</Text>
    </Pressable>
  );
}
