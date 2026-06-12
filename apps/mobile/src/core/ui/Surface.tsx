import type { JSX, ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '../design/metrics';
import { useThemeColors } from '../theme';

interface SurfaceProps {
  children: ReactNode;
  elevated?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Surface({ children, elevated = false, style }: SurfaceProps): JSX.Element {
  const colors = useThemeColors();

  return (
    <View
      style={[
        styles.surface,
        { backgroundColor: colors.secondarySystemGroupedBackground },
        elevated ? styles.elevated : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: radius.card,
    overflow: 'hidden',
    padding: spacing.lg,
  },
  elevated: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { height: 8, width: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    default: {
      elevation: 4,
    },
  }) as ViewStyle,
});
