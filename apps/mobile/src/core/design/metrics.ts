import { StyleSheet } from 'react-native';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
} as const;

export const radius = {
  control: 12,
  card: 16,
  modal: 20,
  capsule: 999,
} as const;

export const hairline = StyleSheet.hairlineWidth;

export const screenPadding = spacing.lg;
