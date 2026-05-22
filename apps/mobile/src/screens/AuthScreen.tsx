import * as Linking from 'expo-linking';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getTeslaLoginUrl } from '../services/api/auth-api';
import { ThemeColors, useThemeColors } from '../core/theme';
import { getCustomApiUrl, resetCurrentApiUrl, setCurrentApiUrl } from '../services/api/api-client';
import { getCustomVirtualKeyPairingUrl, resetCurrentVirtualKeyPairingUrl, setCurrentVirtualKeyPairingUrl } from '../services/api/virtual-key';

interface AuthScreenProps {
  onAuthenticated(token: string): Promise<void>;
}

export function AuthScreen({ onAuthenticated }: AuthScreenProps): JSX.Element {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
  const [advancedTapCount, setAdvancedTapCount] = useState(0);
  const [apiUrl, setApiUrl] = useState(getCustomApiUrl());
  const [virtualKeyPairingUrl, setVirtualKeyPairingUrl] = useState(getCustomVirtualKeyPairingUrl());
  const scrollViewRef = useRef<ScrollView>(null);
  const colors = useThemeColors();
  const styles = createStyles(colors);

  useEffect(() => {
    const authenticateFromUrl = (url: string | null): void => {
      const token = extractTokenFromCallbackUrl(url ?? '');
      if (token) {
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
      const login = await getTeslaLoginUrl(redirectUri);

      if (Platform.OS === 'web') {
        globalThis.location?.assign(login.url);
        return;
      }

      await Linking.openURL(login.url);
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

    await setCurrentApiUrl(trimmedApiUrl);
    setApiUrl(getCustomApiUrl());
  };

  const applyPendingVirtualKeyPairingUrl = async (): Promise<void> => {
    const trimmedVirtualKeyPairingUrl = virtualKeyPairingUrl.trim();

    if (!trimmedVirtualKeyPairingUrl) {
      return;
    }

    if (!/^https?:\/\/.+/.test(trimmedVirtualKeyPairingUrl)) {
      throw new Error(t('auth.error.virtualKeyUrl'));
    }

    await setCurrentVirtualKeyPairingUrl(trimmedVirtualKeyPairingUrl);
    setVirtualKeyPairingUrl(getCustomVirtualKeyPairingUrl());
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
    await resetCurrentApiUrl();
    await resetCurrentVirtualKeyPairingUrl();
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
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardAvoider}>
        <ScrollView ref={scrollViewRef} keyboardShouldPersistTaps="handled" style={styles.scroller} contentContainerStyle={styles.content}>
          <View style={styles.hero}>
            <Pressable onPress={revealAdvancedSettings}>
              <Text selectable={false} style={styles.brand}>SentryGuard</Text>
            </Pressable>
            <Text style={styles.title}>{t('auth.title')}</Text>
            <Text style={styles.subtitle}>{t('auth.subtitle')}</Text>
          </View>

          <View style={styles.panel}>
            <Pressable disabled={isAuthenticating} style={[styles.primaryButton, isAuthenticating ? styles.disabledButton : null]} onPress={openTeslaLogin}>
              <Text style={styles.primaryButtonText}>{isAuthenticating ? t('auth.loginPending') : t('auth.login')}</Text>
            </Pressable>

            {isAdvancedVisible ? (
              <View style={styles.advancedSection}>
                <Text style={styles.manualLabel}>{t('auth.advanced.label')}</Text>
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setApiUrl}
                  onFocus={scrollToAdvancedSettings}
                  placeholder={t('auth.advanced.apiPlaceholder')}
                  placeholderTextColor={colors.muted}
                  style={styles.apiInput}
                  value={apiUrl}
                />
                <TextInput
                  autoCapitalize="none"
                  autoCorrect={false}
                  onChangeText={setVirtualKeyPairingUrl}
                  onFocus={scrollToAdvancedSettings}
                  placeholder={t('auth.advanced.virtualKeyPlaceholder')}
                  placeholderTextColor={colors.muted}
                  style={styles.apiInput}
                  value={virtualKeyPairingUrl}
                />
                <View style={styles.advancedActions}>
                  <Pressable style={styles.smallButton} onPress={saveAdvancedSettings}>
                    <Text style={styles.smallButtonText}>{t('auth.advanced.save')}</Text>
                  </Pressable>
                  <Pressable style={styles.smallButton} onPress={resetAdvancedSettings}>
                    <Text style={styles.smallButtonText}>{t('auth.advanced.reset')}</Text>
                  </Pressable>
                </View>
              </View>
            ) : null}

            {message ? <Text style={styles.message}>{message}</Text> : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function extractTokenFromCallbackUrl(callbackUrl: string): string | null {
  const parsedUrl = Linking.parse(callbackUrl);
  const token = parsedUrl.queryParams?.token;

  if (typeof token === 'string') {
    return token;
  }

  const hashToken = callbackUrl.match(/[#&]token=([^&]+)/)?.[1];
  return hashToken ? decodeURIComponent(hashToken) : null;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    brand: {
      color: colors.accent,
      fontSize: 17,
      fontWeight: '800',
    },
    advancedActions: {
      flexDirection: 'row',
      gap: 8,
    },
    advancedSection: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 10,
      padding: 12,
    },
    apiInput: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: colors.text,
      padding: 12,
    },
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      flexGrow: 1,
      gap: 20,
      justifyContent: 'space-between',
      padding: 20,
      paddingBottom: 10,
    },
    hero: {
      gap: 10,
      paddingTop: 24,
    },
    disabledButton: {
      opacity: 0.65,
    },
    input: {
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      color: colors.text,
      minHeight: 72,
      padding: 12,
      textAlignVertical: 'top',
    },
    keyboardAvoider: {
      flex: 1,
    },
    manualLabel: {
      color: colors.muted,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    message: {
      color: colors.muted,
      fontSize: 13,
      lineHeight: 19,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      gap: 12,
      padding: 14,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: 15,
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: 16,
      fontWeight: '800',
    },
    smallButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      flex: 1,
      padding: 11,
    },
    smallButtonText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '900',
    },
    scroller: {
      flex: 1,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '900',
      lineHeight: 35,
    },
  });
}
