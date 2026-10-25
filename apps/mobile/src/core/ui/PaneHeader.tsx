import type { JSX } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing } from '../design/metrics';
import { TextVariant } from '../design/typography';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

interface PaneHeaderProps {
  closeLabel: string;
  onClose?(): void;
  title: string;
}

export function PaneHeader({ closeLabel, onClose, title }: PaneHeaderProps): JSX.Element {
  const colors = useThemeColors();

  return (
    <View style={styles.row}>
      <AppText variant={TextVariant.LargeTitle} style={styles.title}>
        {title}
      </AppText>
      {onClose ? (
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onClose}>
          <AppText variant={TextVariant.Body} color={colors.accent}>
            {closeLabel}
          </AppText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'flex-end',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  title: {
    flex: 1,
  },
});
