import { Ionicons } from '@expo/vector-icons';
import { SymbolView, type SymbolViewProps, type SymbolWeight } from 'expo-symbols';
import type { JSX } from 'react';
import { Platform, type StyleProp, type ViewStyle } from 'react-native';

import { useThemeColors } from '../theme';

type SfSymbol = SymbolViewProps['name'];

interface IconProps {
  color?: string;
  name: SfSymbol;
  size?: number;
  style?: StyleProp<ViewStyle>;
  weight?: SymbolWeight;
}

/**
 * SF Symbol name -> Ionicons name, used on Android/web where SF Symbols are
 * unavailable. Keep this in sync with the symbols referenced across the app.
 */
const ioniconsFallback: Record<string, keyof typeof Ionicons.glyphMap> = {
  'arrow.up.right.square': 'open-outline',
  'bell.badge.fill': 'notifications',
  'bell.fill': 'notifications',
  'bolt.car.fill': 'car-sport',
  'car.2.fill': 'car-sport',
  'car.fill': 'car',
  'checkmark.shield.fill': 'shield-checkmark',
  'chevron.right': 'chevron-forward',
  'cup.and.saucer.fill': 'cafe',
  'envelope.fill': 'mail',
  'exclamationmark.shield.fill': 'shield-half',
  'exclamationmark.triangle.fill': 'warning',
  'gearshape.fill': 'settings',
  'key.fill': 'key',
  'person.fill': 'person',
  'rectangle.portrait.and.arrow.right': 'log-out-outline',
  'shield.lefthalf.filled': 'shield-half',
  'star.fill': 'star',
  'paperplane.fill': 'paper-plane',
  'trash.fill': 'trash',
  'link': 'link',
};

const useNativeSymbols = Platform.OS === 'ios';

export function Icon({ name, size = 22, color, weight = 'regular', style }: IconProps): JSX.Element {
  const colors = useThemeColors();
  const tintColor = color ?? colors.label;

  if (useNativeSymbols) {
    return (
      <SymbolView
        name={name}
        size={size}
        tintColor={tintColor}
        weight={weight}
        resizeMode="scaleAspectFit"
        style={[{ height: size, width: size }, style]}
      />
    );
  }

  const ionicon = ioniconsFallback[name] ?? 'ellipse';

  return <Ionicons name={ionicon} size={size} color={tintColor} style={style} />;
}
