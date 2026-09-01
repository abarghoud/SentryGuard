import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, Icon, Surface } from '../../../core/ui';
import { Supporter } from '../../../features/supporters/domain/entities';

interface SupporterCardProps {
  language: string;
  supporter: Supporter;
}

export function SupporterCard({ language, supporter }: SupporterCardProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const isVip = supporter.coffees >= 10;
  const initial = (supporter.name || 'A').charAt(0).toUpperCase();

  return (
    <Surface
      style={[
        styles.card,
        isVip ? { borderColor: colors.warningBorder, borderWidth: 1.5 } : undefined,
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isVip ? colors.warningSurface : colors.secondaryFill,
              borderColor: isVip ? colors.warningBorder : colors.separator,
            },
          ]}
        >
          {isVip ? (
            <Icon name="crown.fill" size={20} color={colors.warningFill} />
          ) : (
            <AppText
              variant={TextVariant.Headline}
              style={{ color: colors.label, fontWeight: '700' }}
            >
              {initial}
            </AppText>
          )}
        </View>
        <View style={styles.nameBlock}>
          <View style={styles.nameRow}>
            <AppText
              variant={TextVariant.Headline}
              numberOfLines={1}
              ellipsizeMode="tail"
              style={styles.nameText}
            >
              {supporter.name}
            </AppText>
            {isVip ? (
              <View
                style={[
                  styles.vipPill,
                  {
                    backgroundColor: colors.warningSurface,
                    borderColor: colors.warningBorder,
                  },
                ]}
              >
                <AppText
                  variant={TextVariant.Caption2}
                  style={[styles.vipPillText, { color: colors.warningFill }]}
                >
                  VIP
                </AppText>
              </View>
            ) : null}
          </View>
          <AppText variant={TextVariant.Caption1} color={colors.secondaryLabel}>
            {formatDate(supporter.supportDate, language)}
          </AppText>
        </View>
        <View style={styles.badgeContainer}>
          {supporter.isSubscriber ? (
            <View
              style={[
                styles.badge,
                {
                  backgroundColor: colors.warningSurface,
                  borderColor: colors.warningBorder,
                },
              ]}
            >
              <Icon name="star.fill" size={11} color={colors.warningFill} />
              <AppText
                variant={TextVariant.Caption2}
                style={{
                  color: colors.warningFill,
                  fontWeight: '700',
                }}
              >
                {supporter.monthlyCoffees
                  ? t('supporters.monthlyCount', { count: supporter.monthlyCoffees })
                  : t('supporters.member')}
              </AppText>
            </View>
          ) : null}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isVip ? colors.warningSurface : colors.fill,
                borderColor: isVip ? colors.warningBorder : colors.separator,
              },
            ]}
          >
            <Icon
              name="cup.and.saucer.fill"
              size={13}
              color={isVip ? colors.warningFill : colors.accent}
            />
            <AppText
              variant={TextVariant.Subhead}
              style={{
                color: isVip ? colors.warningFill : colors.accent,
                fontWeight: '700',
              }}
            >
              x{supporter.coffees}
            </AppText>
          </View>
        </View>
      </View>
      {supporter.message?.trim() ? (
        <View style={[styles.messageBox, { backgroundColor: colors.secondaryFill }]}>
          <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
            « {supporter.message} »
          </AppText>
        </View>
      ) : null}
    </Surface>
  );
}

function formatDate(dateStr: string, language: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(language || 'fr-FR', {
      dateStyle: 'medium',
    }).format(date);
  } catch {
    return dateStr;
  }
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    borderRadius: radius.capsule,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  badge: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    flexShrink: 0,
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    flexDirection: 'column',
    flexShrink: 0,
    gap: 4,
  },
  card: {
    gap: spacing.sm,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  messageBox: {
    borderRadius: radius.control,
    marginTop: spacing.xs,
    padding: spacing.sm,
  },
  nameBlock: {
    flex: 1,
    minWidth: 0,
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  nameText: {
    flexShrink: 1,
  },
  vipPill: {
    borderRadius: 4,
    borderWidth: 1,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  vipPillText: {
    fontWeight: '700',
  },
});
