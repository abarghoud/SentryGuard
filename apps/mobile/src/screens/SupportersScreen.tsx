import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useScreenTopInset } from '../core/design/use-screen-inset';
import { useThemeColors } from '../core/theme';
import { AppText, Icon, Surface } from '../core/ui';
import { getSupportersUseCase } from '../features/supporters/di';
import { SupporterCard } from './supporters/components/SupporterCard';

export function SupportersScreen(): JSX.Element {
  const { i18n, t } = useTranslation();
  const colors = useThemeColors();
  const topInset = useScreenTopInset();

  const supportersQuery = useQuery({
    queryFn: () => getSupportersUseCase.execute(),
    queryKey: ['supporters'],
    staleTime: 30000,
  });

  const data = supportersQuery.data;
  const supporters = data?.supporters ?? [];
  const hasSupporters = supporters.length > 0;

  return (
    <ScrollView
      style={{ backgroundColor: colors.systemGroupedBackground, flex: 1 }}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: topInset + spacing.sm,
          paddingBottom: spacing.xxl * 4,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={true}
      refreshControl={
        <RefreshControl
          refreshing={supportersQuery.isRefetching}
          onRefresh={() => void supportersQuery.refetch()}
          tintColor={colors.secondaryLabel}
        />
      }
    >
      <View style={styles.header}>
        <AppText variant={TextVariant.LargeTitle} style={styles.title}>
          {t('supporters.title')}
        </AppText>
        <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
          {t('supporters.subtitle')}
        </AppText>
      </View>

      <Surface style={styles.bannerCard}>
        <View style={styles.bannerHeader}>
          <View style={[styles.iconCircle, { backgroundColor: colors.warningSurface }]}>
            <Icon name="heart.fill" size={20} color={colors.warningFill} />
          </View>
          <View style={styles.bannerText}>
            <AppText variant={TextVariant.Headline}>
              {t('supporters.bannerTitle')}
            </AppText>
            <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
              {t('supporters.bannerDescription')}
            </AppText>
          </View>
        </View>
      </Surface>

      {supporters.length > 0 ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="cup.and.saucer.fill" size={18} color={colors.accent} />
            <AppText variant={TextVariant.Title3}>
              {t('supporters.donations')}
            </AppText>
          </View>
          <View style={styles.cardsList}>
            {supporters.map((supporter) => (
              <SupporterCard
                key={supporter.id}
                supporter={supporter}
                language={i18n.language}
              />
            ))}
          </View>
        </View>
      ) : null}

      {!hasSupporters && !supportersQuery.isLoading ? (
        <Surface style={styles.emptyCard}>
          <Icon name="cup.and.saucer.fill" size={32} color={colors.secondaryLabel} />
          <AppText variant={TextVariant.Headline} style={styles.emptyTitle}>
            {t('supporters.emptyTitle')}
          </AppText>
          <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel} style={styles.emptyText}>
            {t('supporters.emptyDescription')}
          </AppText>
        </Surface>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cardsList: {
    gap: spacing.sm,
  },
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
  bannerCard: {
    gap: spacing.md,
  },
  bannerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  bannerText: {
    flex: 1,
    gap: spacing.xs,
  },
  emptyCard: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyDescription: {
    textAlign: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  emptyTitle: {
    textAlign: 'center',
  },
  header: {
    gap: spacing.xs,
  },
  iconCircle: {
    alignItems: 'center',
    borderRadius: 999,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  section: {
    gap: spacing.md,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  title: {
    paddingTop: spacing.sm,
  },
});
