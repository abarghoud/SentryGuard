import { useNavigation } from '@react-navigation/native';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { readableContent, screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useTabPaneInsets } from '../core/design/use-screen-inset';
import { useThemeColors } from '../core/theme';
import { AppText, FoldAwareScrollView, GlassButton, PaneHeader, Surface } from '../core/ui';
import { revokeConsentUseCase } from '../features/consent/di';
import { confirmAccountDeletion } from './settings/settings.helpers';
import { deleteAccountCooldownSeconds, hasCooldownElapsed, resolveDeleteAccountCtaLabel } from './delete-account/delete-account.helpers';
import { useDeletionCooldown } from './delete-account/use-deletion-cooldown';

interface DeleteAccountScreenProps {
  onLogout(): Promise<void>;
}

interface DeleteAccountViewProps {
  onClose?(): void;
  onLogout(): Promise<void>;
}

export function DeleteAccountScreen({ onLogout }: DeleteAccountScreenProps): JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: t('settings.deleteAccountTitle') });
  }, [navigation, t]);

  return <DeleteAccountView onLogout={onLogout} />;
}

export function DeleteAccountView({ onClose, onLogout }: DeleteAccountViewProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const paneInsets = useTabPaneInsets();
  const remainingSeconds = useDeletionCooldown(deleteAccountCooldownSeconds);
  const [isDeleting, setIsDeleting] = useState(false);
  const isConfirmable = hasCooldownElapsed(remainingSeconds) && !isDeleting;

  const handleDeleteAccount = (): void => {
    confirmAccountDeletion(() => {
      void deleteAccount();
    }, t);
  };

  const deleteAccount = async (): Promise<void> => {
    setIsDeleting(true);

    try {
      await revokeConsentUseCase.execute();
      await onLogout();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <FoldAwareScrollView
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: screenPadding + paneInsets.paddingBottom, paddingTop: screenPadding + paneInsets.paddingTop },
      ]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {paneInsets.isInsideTabs ? <PaneHeader closeLabel={t('common.done')} onClose={onClose} title={t('settings.deleteAccountTitle')} /> : null}

      <Surface style={styles.card}>
        <AppText variant={TextVariant.Title3}>{t('settings.deleteAccountTitle')}</AppText>
        <AppText android_hyphenationFrequency="full" variant={TextVariant.Body} color={colors.secondaryLabel} style={styles.paragraph}>
          {t('settings.deleteAccountConfirm')}
        </AppText>
        <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
          {t('settings.deleteAccountCooldownHint')}
        </AppText>
      </Surface>

      <GlassButton
        destructive
        disabled={!isConfirmable}
        label={isDeleting ? t('common.loading') : resolveDeleteAccountCtaLabel(remainingSeconds, t)}
        onPress={handleDeleteAccount}
      />
    </FoldAwareScrollView>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  paragraph: {
    textAlign: 'justify',
  },
  content: {
    ...readableContent,
    gap: spacing.xl,
    padding: screenPadding,
  },
});
