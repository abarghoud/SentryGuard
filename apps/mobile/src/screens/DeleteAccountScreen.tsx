import { useNavigation } from '@react-navigation/native';
import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet } from 'react-native';

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText, GlassButton, Surface } from '../core/ui';
import { revokeConsentUseCase } from '../features/consent/di';
import { confirmAccountDeletion } from './settings/settings.helpers';
import { deleteAccountCooldownSeconds, hasCooldownElapsed, resolveDeleteAccountCtaLabel } from './delete-account/delete-account.helpers';
import { useDeletionCooldown } from './delete-account/use-deletion-cooldown';

interface DeleteAccountScreenProps {
  onLogout(): Promise<void>;
}

export function DeleteAccountScreen({ onLogout }: DeleteAccountScreenProps): JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const remainingSeconds = useDeletionCooldown(deleteAccountCooldownSeconds);
  const [isDeleting, setIsDeleting] = useState(false);
  const isConfirmable = hasCooldownElapsed(remainingSeconds) && !isDeleting;

  useEffect(() => {
    navigation.setOptions({ title: t('settings.deleteAccountTitle') });
  }, [navigation, t]);

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
    <ScrollView
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={styles.content}
    >
      <Surface style={styles.card}>
        <AppText variant={TextVariant.Title3}>{t('settings.deleteAccountTitle')}</AppText>
        <AppText variant={TextVariant.Body} color={colors.secondaryLabel} style={styles.paragraph}>
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
    </ScrollView>
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
    gap: spacing.xl,
    padding: screenPadding,
  },
});
