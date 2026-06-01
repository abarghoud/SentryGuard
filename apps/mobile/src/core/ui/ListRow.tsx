import type { SymbolViewProps } from 'expo-symbols';
import type { JSX, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../design/metrics';
import { TextVariant } from '../design/typography';
import { useHaptics } from '../design/use-haptics';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface ListRowProps {
  accessory?: ReactNode;
  icon?: SymbolViewProps['name'];
  iconColor?: string;
  onPress?(): void;
  showChevron?: boolean;
  stacked?: boolean;
  subtitle?: string;
  title: string;
  titleColor?: string;
  value?: string;
}

export function ListRow({
  accessory,
  icon,
  iconColor,
  onPress,
  showChevron = false,
  stacked = false,
  subtitle,
  title,
  titleColor,
  value,
}: ListRowProps): JSX.Element {
  const colors = useThemeColors();
  const haptics = useHaptics();

  if (stacked) {
    return (
      <View style={styles.stackedRow}>
        <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
          {title.toUpperCase()}
        </AppText>
        {value ? <AppText variant={TextVariant.Body}>{value}</AppText> : null}
      </View>
    );
  }

  const body = (
    <View style={styles.row}>
      {icon ? <Icon name={icon} size={22} color={iconColor ?? colors.systemBlue} /> : null}
      <View style={styles.text}>
        <AppText variant={TextVariant.Body} color={titleColor ?? colors.label} numberOfLines={1}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {value ? (
        <AppText variant={TextVariant.Body} color={colors.secondaryLabel} numberOfLines={1} ellipsizeMode="middle" style={styles.value}>
          {value}
        </AppText>
      ) : null}
      {accessory}
      {showChevron ? <Icon name="chevron.right" size={14} color={colors.tertiaryLabel} weight="semibold" /> : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  const handlePress = (): void => {
    haptics.selection();
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      onPress={handlePress}
      style={({ pressed }) => [pressed ? { backgroundColor: colors.fill } : null]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 44,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stackedRow: {
    gap: 3,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  value: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
