import * as Linking from 'expo-linking';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useThemeColors } from '../core/theme';
import { apiUrlStore, virtualKeyStore } from '../core/api';
import { getTeslaLoginUrlUseCase } from '../features/auth/di';
import { extractTokenFromCallbackUrl } from './auth/auth.helpers';
import { createAuthStyles } from './auth/auth.styles';

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
  const styles = createAuthStyles(colors);

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
      const login = await getTeslaLoginUrlUseCase.execute(redirectUri);

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

    await apiUrlStore.setUrl(trimmedApiUrl);
    setApiUrl(apiUrlStore.getCustomUrl());
  };

  const applyPendingVirtualKeyPairingUrl = async (): Promise<void> => {
    const trimmedVirtualKeyPairingUrl = virtualKeyPairingUrl.trim();

    if (!trimmedVirtualKeyPairingUrl) {
      return;
    }

    if (!/^https?:\/\/.+/.test(trimmedVirtualKeyPairingUrl)) {
      throw new Error(t('auth.error.virtualKeyUrl'));
    }

    await virtualKeyStore.setUrl(trimmedVirtualKeyPairingUrl);
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
