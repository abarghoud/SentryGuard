import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText, GlassButton, GlassButtonVariant, ListRow, ListSection } from '../core/ui';
import { useHiddenVehicles } from './settings/use-hidden-vehicles';

export function HiddenVehiclesScreen(): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { hiddenVehicles, isLoading, restoreMutation } = useHiddenVehicles();

  if (hiddenVehicles.length === 0) {
    return (
      <View style={[styles.empty, { backgroundColor: colors.systemGroupedBackground }]}>
        <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
          {isLoading ? t('common.loading') : t('settings.hiddenEmpty')}
        </AppText>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={styles.content}
      contentInsetAdjustmentBehavior="automatic"
    >
      <ListSection footer={t('settings.hiddenFooter')}>
        {hiddenVehicles.map((vehicle) => (
          <ListRow
            key={vehicle.vin}
            title={vehicle.display_name ?? vehicle.model ?? vehicle.vin}
            accessory={
              <GlassButton
                label={t('settings.hiddenRestore')}
                variant={GlassButtonVariant.Secondary}
                disabled={restoreMutation.isPending}
                onPress={() => restoreMutation.mutate(vehicle.vin)}
              />
            }
          />
        ))}
      </ListSection>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  empty: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
});
