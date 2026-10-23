import type { JSX, ReactNode } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { screenPadding, spacing } from '../design/metrics';
import { useTabPaneInsets } from '../design/use-screen-inset';
import { useThemeColors } from '../theme';

interface CenteredPaneProps {
  children: ReactNode;
}

export function CenteredPane({ children }: CenteredPaneProps): JSX.Element {
  const colors = useThemeColors();
  const safeAreaInsets = useSafeAreaInsets();
  const paneInsets = useTabPaneInsets();

  return (
    <ScrollView
      alwaysBounceVertical={false}
      contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + paneInsets.paddingBottom, paddingTop: spacing.xl + safeAreaInsets.top }]}
      contentInsetAdjustmentBehavior="never"
      style={{ backgroundColor: colors.systemGroupedBackground }}
    >
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    alignItems: 'center',
    flexGrow: 1,
    gap: spacing.lg,
    justifyContent: 'center',
    paddingHorizontal: screenPadding,
  },
});
