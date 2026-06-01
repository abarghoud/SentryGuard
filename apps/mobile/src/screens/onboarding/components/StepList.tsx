import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText } from '../../../core/ui';

export function StepList({ items }: { items: string[] }): JSX.Element {
  const colors = useThemeColors();

  return (
    <View style={styles.steps}>
      {items.map((item, index) => (
        <View key={item} style={styles.stepRow}>
          <View style={[styles.badge, { backgroundColor: colors.systemBlue }]}>
            <AppText variant={TextVariant.Caption1} color={colors.onAccent} style={styles.badgeText}>
              {index + 1}
            </AppText>
          </View>
          <AppText variant={TextVariant.Subhead} style={styles.text}>
            {item}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    width: 24,
  },
  badgeText: {
    fontWeight: '700',
  },
  stepRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  steps: {
    gap: spacing.md,
  },
  text: {
    flex: 1,
  },
});
