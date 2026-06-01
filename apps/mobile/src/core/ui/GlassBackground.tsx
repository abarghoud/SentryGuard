import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { JSX } from 'react';
import { StyleSheet } from 'react-native';

import { useTheme } from '../theme';

const liquidGlassAvailable = isLiquidGlassAvailable();

export function GlassBackground(): JSX.Element {
  const { isDark } = useTheme();

  if (liquidGlassAvailable) {
    return <GlassView glassEffectStyle="regular" colorScheme={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />;
  }

  return <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />;
}
