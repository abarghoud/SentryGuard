import type { JSX } from 'react';
import { Platform, Switch } from 'react-native';

import { useHaptics } from '../design/use-haptics';
import { useThemeColors } from '../theme';

interface AppSwitchProps {
  disabled?: boolean;
  onValueChange(value: boolean): void;
  value: boolean;
}

export function AppSwitch({ disabled = false, onValueChange, value }: AppSwitchProps): JSX.Element {
  const colors = useThemeColors();
  const haptics = useHaptics();
  const isAndroid = Platform.OS === 'android';

  const handleChange = (next: boolean): void => {
    haptics.selection();
    onValueChange(next);
  };

  return (
    <Switch
      disabled={disabled}
      ios_backgroundColor={colors.fill}
      onValueChange={handleChange}
      thumbColor={isAndroid ? '#ffffff' : undefined}
      trackColor={{ false: colors.fill, true: colors.accent }}
      value={value}
    />
  );
}
