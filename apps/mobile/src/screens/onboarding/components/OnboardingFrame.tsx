import type { JSX } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, screenPadding, spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, Surface } from '../../../core/ui';
import { TranslationFunction } from '../onboarding.helpers';

export function OnboardingFrame({
  actions,
  children,
  kicker,
  message,
  subtitle,
  t,
  title,
}: {
  actions?: JSX.Element;
  children?: JSX.Element;
  kicker?: string;
  message?: string | null;
  subtitle: string;
  t: TranslationFunction;
  title: string;
}): JSX.Element {
  const colors = useThemeColors();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.systemBackground }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <AppText variant={TextVariant.Footnote} color={colors.accent} style={styles.kicker}>
            {(kicker ?? t('onboarding.kicker')).toUpperCase()}
          </AppText>
          <AppText variant={TextVariant.Title1}>{title}</AppText>
          <AppText variant={TextVariant.Body} color={colors.secondaryLabel}>
            {subtitle}
          </AppText>
        </View>
        {children ? <Surface>{children}</Surface> : null}
        {message ? (
          <View style={[styles.alertBox, { backgroundColor: colors.warningSurface, borderColor: colors.warningBorder }]}>
            <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
              {message}
            </AppText>
          </View>
        ) : null}
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
  },
  container: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    gap: spacing.xl,
    justifyContent: 'center',
    padding: screenPadding,
  },
  header: {
    gap: spacing.sm,
  },
  kicker: {
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  alertBox: {
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.md,
    width: '100%',
  },
});
