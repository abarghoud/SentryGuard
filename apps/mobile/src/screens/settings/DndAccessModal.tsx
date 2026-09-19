import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';

import { spacing } from '../../core/design/metrics';
import { TextVariant } from '../../core/design/typography';
import { useTheme } from '../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Surface } from '../../core/ui';
import { openAndroidDoNotDisturbAccessSettings } from './settings.helpers';

interface DndAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DndAccessModal({ isOpen, onClose }: DndAccessModalProps): JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={isOpen}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Surface style={styles.card}>
          <AppText variant={TextVariant.Title3}>{t('settings.dndAccessTitle')}</AppText>
          <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
            {t('settings.dndAccessDescription')}
          </AppText>
          <GlassButton
            label={t('settings.dndAccessButton')}
            onPress={() => void openAndroidDoNotDisturbAccessSettings(() => onClose())}
          />
          <GlassButton label={t('common.cancel')} variant={GlassButtonVariant.Plain} onPress={onClose} />
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    gap: spacing.md,
    maxWidth: 360,
    width: '100%',
  },
});
