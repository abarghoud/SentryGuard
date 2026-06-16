import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, screenPadding, spacing } from '../core/design/metrics';
import { TextVariant, textStyle } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Surface } from '../core/ui';
import { FixPermissionsScreen } from './FixPermissionsScreen';
import { useAuthScreen } from './auth/use-auth-screen';

const appLogo = require('../../assets/icon.png');

interface AuthScreenProps {
  onAuthenticated(token: string): Promise<void>;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = createStyles(colors);

  const {
    message,
    isAuthenticating,
    missingScopes,
    isAdvancedVisible,
    apiUrl,
    virtualKeyPairingUrl,
    isDemoFormVisible,
    demoEmail,
    demoPassword,
    isDemoLoggingIn,
    scrollViewRef,
    openTeslaLogin,
    fixPermissions,
    cancelPermissionsFix,
    handleDemoSubmit,
    revealAdvancedSettings,
    saveAdvancedSettings,
    resetAdvancedSettings,
    setIsDemoFormVisible,
    setDemoEmail,
    setDemoPassword,
    setApiUrl,
    setVirtualKeyPairingUrl,
    scrollToAdvancedSettings,
  } = useAuthScreen({ onAuthenticated });

  if (missingScopes) {
    return (
      <FixPermissionsScreen
        isAuthenticating={isAuthenticating}
        message={message}
        onFix={fixPermissions}
        onBackToLogin={cancelPermissionsFix}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled" style={styles.flex} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Pressable accessibilityRole="button" onPress={revealAdvancedSettings}>
              <Image source={appLogo} style={styles.logo} resizeMode="contain" />
            </Pressable>
            <AppText variant={TextVariant.LargeTitle} style={styles.centerText}>
              SentryGuard
            </AppText>
            <AppText variant={TextVariant.Title3} style={styles.centerText}>
              {t('auth.title')}
            </AppText>
            <AppText variant={TextVariant.Body} color={colors.secondaryLabel} style={styles.centerText}>
              {t('auth.subtitle')}
            </AppText>
          </View>

          <View style={styles.actions}>
            <GlassButton
              label={isAuthenticating ? t('auth.loginPending') : t('auth.login')}
              icon="bolt.car.fill"
              disabled={isAuthenticating}
              onPress={openTeslaLogin}
            />

            <Pressable accessibilityRole="button" onPress={() => setIsDemoFormVisible(!isDemoFormVisible)} style={styles.demoLink}>
              <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel} style={styles.centerText}>
                {t('auth.demo.toggleLink')}
              </AppText>
            </Pressable>

            {isDemoFormVisible ? (
              <Surface style={styles.advanced}>
                <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
                  {t('auth.demo.label').toUpperCase()}
                </AppText>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setDemoEmail}
                  placeholder={t('auth.demo.emailPlaceholder')}
                  placeholderTextColor={colors.tertiaryLabel}
                  style={styles.input}
                  value={demoEmail}
                />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry
                  onChangeText={setDemoPassword}
                  placeholder={t('auth.demo.passwordPlaceholder')}
                  placeholderTextColor={colors.tertiaryLabel}
                  style={styles.input}
                  value={demoPassword}
                />
                <GlassButton
                  label={isDemoLoggingIn ? t('auth.demo.loading') : t('auth.demo.submit')}
                  disabled={isDemoLoggingIn}
                  onPress={handleDemoSubmit}
                />
              </Surface>
            ) : null}

            {isAdvancedVisible ? (
              <Surface style={styles.advanced}>
                <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
                  {t('auth.advanced.label').toUpperCase()}
                </AppText>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setVirtualKeyPairingUrl}
                  onFocus={scrollToAdvancedSettings}
                  placeholder={t('auth.advanced.virtualKeyPlaceholder')}
                  placeholderTextColor={colors.tertiaryLabel}
                  style={styles.input}
                  value={virtualKeyPairingUrl}
                />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setApiUrl}
                  onFocus={scrollToAdvancedSettings}
                  placeholder={t('auth.advanced.apiPlaceholder')}
                  placeholderTextColor={colors.tertiaryLabel}
                  style={styles.input}
                  value={apiUrl}
                />
                <View style={styles.advancedActions}>
                  <GlassButton label={t('auth.advanced.save')} variant={GlassButtonVariant.Secondary} onPress={saveAdvancedSettings} style={styles.flex} />
                  <GlassButton label={t('auth.advanced.reset')} variant={GlassButtonVariant.Plain} onPress={resetAdvancedSettings} style={styles.flex} />
                </View>
              </Surface>
            ) : null}

            {message ? (
              <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel} style={styles.centerText}>
                {message}
              </AppText>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function createStyles(colors: ReturnType<typeof useThemeColors>) {
  return StyleSheet.create({
    actions: {
      gap: spacing.md,
    },
    advanced: {
      gap: spacing.md,
    },
    advancedActions: {
      flexDirection: 'row',
      gap: spacing.sm,
    },
    centerText: {
      textAlign: 'center',
    },
    demoLink: {
      alignSelf: 'center',
      paddingVertical: spacing.sm,
    },
    container: {
      backgroundColor: colors.systemBackground,
      flex: 1,
    },
    content: {
      flexGrow: 1,
      gap: spacing.xxl,
      justifyContent: 'center',
      padding: screenPadding,
    },
    flex: {
      flex: 1,
    },
    hero: {
      alignItems: 'center',
      gap: spacing.md,
    },
    input: {
      backgroundColor: colors.fill,
      borderRadius: radius.control,
      color: colors.label,
      fontSize: textStyle(TextVariant.Body).fontSize,
      padding: spacing.md,
    },
    logo: {
      height: 96,
      marginBottom: spacing.sm,
      width: 96,
    },
  });
}
