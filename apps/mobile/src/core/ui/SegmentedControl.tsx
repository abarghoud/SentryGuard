import type { JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../design/metrics';
import { TextVariant } from '../design/typography';
import { useHaptics } from '../design/use-haptics';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

export interface SegmentOption<T extends string> {
  label: string;
  value: T;
}

interface SegmentedControlProps<T extends string> {
  onChange(value: T): void;
  options: SegmentOption<T>[];
  value: T;
}

export function SegmentedControl<T extends string>({ onChange, options, value }: SegmentedControlProps<T>): JSX.Element {
  const colors = useThemeColors();
  const haptics = useHaptics();

  return (
    <View style={[styles.track, { backgroundColor: colors.secondaryFill }]}>
      {options.map((option) => {
        const isActive = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected: isActive }}
            onPress={() => {
              haptics.selection();
              onChange(option.value);
            }}
            style={[styles.segment, isActive ? { backgroundColor: colors.secondarySystemGroupedBackground } : null]}
          >
            <AppText
              variant={TextVariant.Subhead}
              color={isActive ? colors.label : colors.secondaryLabel}
              style={styles.label}
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontWeight: '600',
  },
  segment: {
    alignItems: 'center',
    borderRadius: radius.control - 4,
    flex: 1,
    paddingVertical: spacing.sm,
  },
  track: {
    borderRadius: radius.control,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: 2,
  },
});
