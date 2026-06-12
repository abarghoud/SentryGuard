import type { JSX } from 'react';
import { Text, type TextProps } from 'react-native';

import { TextVariant, typography } from '../design/typography';
import { useThemeColors } from '../theme';

interface AppTextProps extends TextProps {
  color?: string;
  variant?: TextVariant;
}

export function AppText({ variant = TextVariant.Body, color, style, ...rest }: AppTextProps): JSX.Element {
  const colors = useThemeColors();

  return <Text {...rest} style={[typography[variant], { color: color ?? colors.label }, style]} />;
}
