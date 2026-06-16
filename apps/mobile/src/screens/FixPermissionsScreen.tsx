import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Icon } from '../core/ui';

interface FixPermissionsScreenProps {
  isAuthenticating: boolean;
  message: string | null;
  onFix(): Promise<void>;
  onBackToLogin(): void;
}

export function FixPermissionsScreen({ isAuthenticating, message, onFix, onBackToLogin }: FixPermissionsScreenProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: colors.fill }]}>
            <Icon name="exclamationmark.shield.fill" size={36} color={colors.accent} />
          </View>
          <AppText variant={TextVariant.Title1} style={styles.centerText}>
            {t('auth.permissions.title')}
          </AppText>
          <AppText variant={TextVariant.Body} color={colors.secondaryLabel} style={styles.centerText}>
            {t('auth.permissions.description')}
          </AppText>
        </View>

        <View style={styles.actions}>
          <GlassButton
            label={isAuthenticating ? t('auth.loginPending') : t('auth.permissions.fix')}
            icon="bolt.car.fill"
            disabled={isAuthenticating}
            onPress={onFix}
          />
          <GlassButton
            label={t('auth.permissions.back')}
            variant={GlassButtonVariant.Plain}
            disabled={isAuthenticating}
            onPress={onBackToLogin}
          />
          {message ? (
            <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel} style={styles.centerText}>
              {message}
            </AppText>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    actions: {
      gap: spacing.md,
    },
    centerText: {
      textAlign: 'center',
    },
    container: {
      backgroundColor: colors.systemBackground,
      flex: 1,
    },
    content: {
      flex: 1,
      gap: spacing.xxl,
      justifyContent: 'center',
      padding: screenPadding,
    },
    hero: {
      alignItems: 'center',
      gap: spacing.md,
    },
    icon: {
      alignItems: 'center',
      borderRadius: 22,
      height: 88,
      justifyContent: 'center',
      width: 88,
    },
  });
}
