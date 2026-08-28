import type { JSX } from 'react';
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
  const colors = useThemeColors();
  const isVip = supporter.coffees >= 10;
  const initial = (supporter.name || 'A').charAt(0).toUpperCase();

  return (
    <Surface
      style={[
        styles.card,
        isVip ? { borderColor: '#EAB308', borderWidth: 1.5 } : undefined,
      ]}
    >
      <View style={styles.header}>
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: isVip ? '#FEF08A' : colors.secondaryFill,
              borderColor: isVip ? '#F59E0B' : colors.separator,
            },
          ]}
        >
          {isVip ? (
            <Icon name="crown.fill" size={20} color="#B45309" />
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
              <View style={styles.vipPill}>
                <AppText variant={TextVariant.Caption2} style={styles.vipPillText}>
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
                  backgroundColor: '#FEF3C7',
                  borderColor: '#FCD34D',
                },
              ]}
            >
              <Icon name="star.fill" size={11} color="#B45309" />
              <AppText
                variant={TextVariant.Caption2}
                style={{
                  color: '#B45309',
                  fontWeight: '700',
                }}
              >
                {supporter.monthlyCoffees ? `x${supporter.monthlyCoffees}/mo` : 'Membre'}
              </AppText>
            </View>
          ) : null}
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isVip ? '#FEF3C7' : '#FEE2E2',
                borderColor: isVip ? '#FCD34D' : '#FECACA',
              },
            ]}
          >
            <Icon
              name="cup.and.saucer.fill"
              size={13}
              color={isVip ? '#B45309' : '#DC2626'}
            />
            <AppText
              variant={TextVariant.Subhead}
              style={{
                color: isVip ? '#B45309' : '#DC2626',
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
    backgroundColor: '#FEF08A',
    borderRadius: 4,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  vipPillText: {
    color: '#854D0E',
    fontWeight: '700',
  },
});
