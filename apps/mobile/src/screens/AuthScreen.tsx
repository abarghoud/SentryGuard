import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { radius, screenPadding, spacing } from '../core/design/metrics';
import { TextVariant, textStyle } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Surface } from '../core/ui';
import { apiUrlStore, virtualKeyStore } from '../core/api';
import { normalizeDomain } from '../core/config/app-domain';
import { getTeslaLoginUrlUseCase } from '../features/auth/di';
import { extractTokenFromCallbackUrl } from './auth/auth.helpers';

const appLogo = require('../../assets/icon.png');

function openTeslaAuthUrl(url: string): Promise<void> {
  const openBrowser = Platform.select({
    web: async () => {
      globalThis.location?.assign(url);
    },
    android: async () => {
      await Linking.openURL(url);
    },
    default: async () => {
      await WebBrowser.openBrowserAsync(url);
    },
  });

  return openBrowser();
}

interface AuthScreenProps {
  onAuthenticated(token: string): Promise<void>;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps): JSX.Element {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
  const [advancedTapCount, setAdvancedTapCount] = useState(0);
  const [apiUrl, setApiUrl] = useState(apiUrlStore.getCustomUrl());
  const [virtualKeyPairingUrl, setVirtualKeyPairingUrl] = useState(virtualKeyStore.getCustomUrl());
  const scrollViewRef = useRef<ScrollView>(null);
  const colors = useThemeColors();
  const styles = createStyles(colors);

  useEffect(() => {
    const authenticateFromUrl = (url: string | null): void => {
      const token = extractTokenFromCallbackUrl(url ?? '');
      if (token) {
        if (Platform.OS === 'ios') {
          void WebBrowser.dismissBrowser();
        }
        void onAuthenticated(token);
      }
    };

    if (Platform.OS === 'web') {
      authenticateFromUrl(globalThis.location?.href ?? '');
      return;
    }

    void Linking.getInitialURL().then(authenticateFromUrl);
    const subscription = Linking.addEventListener('url', ({ url }) => authenticateFromUrl(url));
    return () => subscription.remove();
  }, [onAuthenticated]);

  const openTeslaLogin = async (): Promise<void> => {
    try {
      setIsAuthenticating(true);
      setMessage(null);
      await applyPendingAdvancedSettings();
      const redirectUri = Linking.createURL('callback');
      const login = await getTeslaLoginUrlUseCase.execute(redirectUri);

      await openTeslaAuthUrl(login.url);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('auth.error.login'));
    } finally {
      setIsAuthenticating(false);
    }
  };

  const applyPendingAdvancedSettings = async (): Promise<void> => {
    await applyPendingApiUrl();
    await applyPendingVirtualKeyPairingUrl();
  };

  const applyPendingApiUrl = async (): Promise<void> => {
    const trimmedApiUrl = apiUrl.trim();

    if (!trimmedApiUrl) {
      return;
    }

    if (!/^https?:\/\/.+/.test(trimmedApiUrl)) {
      throw new Error(t('auth.error.apiUrl'));
    }

    await apiUrlStore.setUrl(trimmedApiUrl);
    setApiUrl(apiUrlStore.getCustomUrl());
  };

  const applyPendingVirtualKeyPairingUrl = async (): Promise<void> => {
    const trimmedVirtualKeyPairingUrl = virtualKeyPairingUrl.trim();

    if (!trimmedVirtualKeyPairingUrl) {
      return;
    }

    const domain = normalizeDomain(trimmedVirtualKeyPairingUrl);

    if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
      throw new Error(t('auth.error.virtualKeyUrl'));
    }

    await virtualKeyStore.setUrl(domain);
    setVirtualKeyPairingUrl(virtualKeyStore.getCustomUrl());
  };

  const saveAdvancedSettings = async (): Promise<void> => {
    try {
      await applyPendingAdvancedSettings();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('auth.advanced.invalid'));
      return;
    }

    setMessage(t('auth.advanced.saved'));
    setIsAdvancedVisible(false);
  };

  const resetAdvancedSettings = async (): Promise<void> => {
    await apiUrlStore.reset();
    await virtualKeyStore.reset();
    setApiUrl('');
    setVirtualKeyPairingUrl('');
    setMessage(t('auth.advanced.resetDone'));
    setIsAdvancedVisible(false);
  };

  const revealAdvancedSettings = (): void => {
    const nextTapCount = advancedTapCount + 1;
    setAdvancedTapCount(nextTapCount);

    if (nextTapCount >= 5) {
      setIsAdvancedVisible(true);
      setAdvancedTapCount(0);
    }
  };

  const scrollToAdvancedSettings = (): void => {
    scrollViewRef.current?.scrollToEnd({ animated: true });
  };

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
