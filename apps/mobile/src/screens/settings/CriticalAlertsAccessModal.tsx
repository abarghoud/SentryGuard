import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';

import { TextVariant } from '../../core/design/typography';
import { useTheme } from '../../core/theme';
import { AppText, CenteredDialog, GlassButton, GlassButtonVariant } from '../../core/ui';
import { CriticalAlertsAvailability, resolveCriticalAlertsAccessContent } from './settings.helpers';

interface CriticalAlertsAccessModalProps {
  blocker: CriticalAlertsAvailability | null;
  onClose: () => void;
}

export function CriticalAlertsAccessModal({ blocker, onClose }: CriticalAlertsAccessModalProps): JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const content = resolveCriticalAlertsAccessContent(blocker);

  const action = content.action;

  const onOpenSettings = (): void => {
    onClose();
    void action?.open();
  };

  return (
    <CenteredDialog isVisible={blocker !== null} maxWidth={360} onRequestClose={onClose}>
      <AppText variant={TextVariant.Title3}>{t(content.titleKey)}</AppText>
      <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
        {t(content.descriptionKey)}
      </AppText>
      {action ? <GlassButton label={t(action.labelKey)} onPress={onOpenSettings} /> : null}
      <GlassButton
        label={action ? t('common.cancel') : t('common.done')}
        variant={GlassButtonVariant.Plain}
        onPress={onClose}
      />
    </CenteredDialog>
  );
}
