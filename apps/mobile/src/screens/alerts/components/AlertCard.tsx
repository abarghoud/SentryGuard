import type { JSX } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';

import { radius, spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon, Surface } from '../../../core/ui';
import { AlertEvent } from '../../../features/alerts/domain/entities';
import {
  formatAlertDate,
  resolveAlertIcon,
  resolveAlertMessageKey,
  resolveAlertTitleKey,
  resolveAlertTone,
} from '../alerts.helpers';

interface AlertCardProps {
  alert: AlertEvent;
  isUnread: boolean;
  language: string;
  onDelete(): void;
  t(key: string): string;
}

export function AlertCard({ alert, isUnread, language, onDelete, t }: AlertCardProps): JSX.Element {
  const colors = useThemeColors();
  const tone = resolveAlertTone(alert, colors);

  const card = (
    <Surface style={styles.card}>
      <View style={[styles.iconWrap, { backgroundColor: tone.background }]}>
        <Icon name={resolveAlertIcon(alert)} size={18} color={tone.icon} />
      </View>
      <View style={styles.cardText}>
        <View style={styles.cardHeader}>
          <View style={styles.titleWrap}>
            {isUnread ? (
              <View
                accessible
                accessibilityLabel={t('alerts.unread')}
                style={[styles.unreadDot, { backgroundColor: colors.accent }]}
              />
            ) : null}
            <AppText variant={TextVariant.Headline} style={styles.cardTitle}>
              {t(resolveAlertTitleKey(alert))}
            </AppText>
          </View>
          <AppText variant={TextVariant.Caption1} color={colors.secondaryLabel}>
            {formatAlertDate(alert.created_at, language)}
          </AppText>
        </View>
        <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
          {t(resolveAlertMessageKey(alert))}
        </AppText>
        <AppText variant={TextVariant.Caption1} color={colors.secondaryLabel}>
          {alert.vehicle_display_name ?? alert.vin}
        </AppText>
      </View>
    </Surface>
  );

  if (Platform.OS === 'web') {
    return card;
  }

  return (
    <ReanimatedSwipeable
      friction={2}
      overshootRight={false}
      rightThreshold={48}
      renderRightActions={() => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('alerts.delete')}
          onPress={onDelete}
          style={[styles.deleteAction, { backgroundColor: colors.criticalFill }]}
        >
          <Icon name="trash.fill" size={20} color={colors.onCritical} />
        </Pressable>
      )}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          onDelete();
        }
      }}
    >
      {card}
    </ReanimatedSwipeable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  cardText: {
    flex: 1,
    gap: spacing.xs,
  },
  cardTitle: {
    flex: 1,
  },
  deleteAction: {
    alignItems: 'center',
    borderRadius: radius.card,
    justifyContent: 'center',
    marginLeft: spacing.sm,
    width: 72,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: 10,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  titleWrap: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  unreadDot: {
    borderRadius: radius.capsule,
    height: 8,
    width: 8,
  },
});
