import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import type { SymbolViewProps } from 'expo-symbols';
import type { JSX } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, spacing } from '../design/metrics';
import { TextVariant } from '../design/typography';
import { useHaptics } from '../design/use-haptics';
import { ThemeColors, useTheme } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

export enum GlassButtonVariant {
  Primary = 'primary',
  Secondary = 'secondary',
  Plain = 'plain',
}

interface GlassButtonProps {
  disabled?: boolean;
  destructive?: boolean;
  icon?: SymbolViewProps['name'];
  label: string;
  onPress(): void;
  style?: StyleProp<ViewStyle>;
  variant?: GlassButtonVariant;
}

const liquidGlassAvailable = isLiquidGlassAvailable();

export function GlassButton({
  disabled = false,
  destructive = false,
  icon,
  label,
  onPress,
  style,
  variant = GlassButtonVariant.Primary,
}: GlassButtonProps): JSX.Element {
  const { colors, isDark } = useTheme();
  const haptics = useHaptics();
  const tone = destructive ? colors.criticalFill : colors.accentFill;
  const labelColor = resolveLabelColor(variant, destructive, colors);

  const handlePress = (): void => {
    haptics.selection();
    onPress();
  };

  const content = (
    <View style={styles.content}>
      {icon ? <Icon name={icon} size={18} color={labelColor} weight="semibold" /> : null}
      <AppText variant={TextVariant.Headline} color={labelColor}>
        {label}
      </AppText>
    </View>
  );

  if (variant === GlassButtonVariant.Primary && liquidGlassAvailable) {
    return (
      <Pressable accessibilityRole="button" disabled={disabled} onPress={handlePress} style={[disabled ? styles.disabled : null, style]}>
        <GlassView glassEffectStyle="regular" isInteractive tintColor={tone} colorScheme={isDark ? 'dark' : 'light'} style={styles.glass}>
          {content}
        </GlassView>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fallback,
        resolveFallbackStyle(variant, tone, colors),
        pressed ? styles.pressed : null,
        disabled ? styles.disabled : null,
        style,
      ]}
    >
      {content}
    </Pressable>
  );
}

function resolveLabelColor(variant: GlassButtonVariant, destructive: boolean, colors: ThemeColors): string {
  if (variant === GlassButtonVariant.Primary) {
    return colors.onAccent;
  }

  return destructive ? colors.systemRed : colors.label;
}

function resolveFallbackStyle(variant: GlassButtonVariant, tone: string, colors: ThemeColors): ViewStyle {
  if (variant === GlassButtonVariant.Primary) {
    return { backgroundColor: tone };
  }

  if (variant === GlassButtonVariant.Secondary) {
    return { backgroundColor: colors.fill };
  }

  return { backgroundColor: 'transparent' };
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
  fallback: {
    alignItems: 'center',
    borderRadius: radius.capsule,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  glass: {
    alignItems: 'center',
    borderRadius: radius.capsule,
    justifyContent: 'center',
    minHeight: 50,
    overflow: 'hidden',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
  },
  pressed: {
    opacity: 0.7,
  },
});
