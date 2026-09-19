import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, StyleSheet, View } from 'react-native';

import { spacing } from '../../core/design/metrics';
import { TextVariant } from '../../core/design/typography';
import { useTheme } from '../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Surface } from '../../core/ui';
import { CriticalAlertsAvailability, resolveCriticalAlertsAccessContent } from './settings.helpers';

interface CriticalAlertsAccessModalProps {
  blocker: CriticalAlertsAvailability | null;
  onClose: () => void;
}

export function CriticalAlertsAccessModal({ blocker, onClose }: CriticalAlertsAccessModalProps): JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const content = resolveCriticalAlertsAccessContent(blocker);

  const onOpenSettings = (): void => {
    onClose();
    void content.open();
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={blocker !== null}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Surface style={styles.card}>
          <AppText variant={TextVariant.Title3}>{t(content.titleKey)}</AppText>
          <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
            {t(content.descriptionKey)}
          </AppText>
          <GlassButton label={t(content.buttonKey)} onPress={onOpenSettings} />
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
