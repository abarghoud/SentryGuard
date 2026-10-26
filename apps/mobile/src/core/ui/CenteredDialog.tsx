import type { JSX, ReactNode } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { spacing } from '../design/metrics';
import { useThemeColors } from '../theme';
import { Surface } from './Surface';

interface CenteredDialogProps {
  children: ReactNode;
  contentGap?: number;
  isVisible: boolean;
  maxWidth?: number;
  onRequestClose(): void;
}

export function CenteredDialog({
  children,
  contentGap = spacing.md,
  isVisible,
  maxWidth = 380,
  onRequestClose,
}: CenteredDialogProps): JSX.Element {
  const colors = useThemeColors();

  return (
    <Modal animationType="fade" onRequestClose={onRequestClose} transparent visible={isVisible}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Surface style={[styles.card, { maxWidth }]}>
          <ScrollView alwaysBounceVertical={false} contentContainerStyle={{ gap: contentGap }}>
            {children}
          </ScrollView>
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    maxHeight: '100%',
    width: '100%',
  },
});
