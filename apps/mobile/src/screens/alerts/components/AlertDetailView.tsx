import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { openTeslaCamera } from '../../../core/tesla-app-link';
import { resolveTeslaCameraUrl } from '../../../core/tesla-camera-link';
import { useThemeColors } from '../../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Icon, ListRow, ListSection, Surface } from '../../../core/ui';
import { AlertEvent } from '../../../features/alerts/domain/entities';
import { formatAlertDateTime, resolveAlertIcon, resolveAlertMessageKey, resolveAlertTitleKey, resolveAlertTone } from '../alerts.helpers';

interface AlertDetailViewProps {
  alert: AlertEvent;
  onDelete(): void;
}

export function AlertDetailView({ alert, onDelete }: AlertDetailViewProps): JSX.Element {
  const { i18n, t } = useTranslation();
  const colors = useThemeColors();
  const tone = resolveAlertTone(alert, colors);
  const hasCameraView = resolveTeslaCameraUrl(alert.vin) !== null;

  return (
    <>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
          <Icon name={resolveAlertIcon(alert)} size={24} color={tone.icon} />
        </View>
        <AppText variant={TextVariant.Title1} style={styles.title}>
          {t(resolveAlertTitleKey(alert))}
        </AppText>
      </View>

      <Surface>
        <AppText variant={TextVariant.Body}>{t(resolveAlertMessageKey(alert))}</AppText>
      </Surface>

      <ListSection>
        <ListRow stacked title={t('alerts.detail.vehicle')} value={alert.vehicle_display_name ?? alert.vin} />
        <ListRow stacked title={t('alerts.detail.date')} value={formatAlertDateTime(alert.created_at, i18n.language)} />
      </ListSection>

      {hasCameraView ? <GlassButton icon="video.fill" label={t('alerts.viewCamera')} onPress={() => void openTeslaCamera(alert.vin)} /> : null}
      <GlassButton destructive icon="trash.fill" label={t('alerts.delete')} onPress={onDelete} variant={GlassButtonVariant.Secondary} />
    </>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.sm,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 12,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  title: {
    flex: 1,
  },
});
