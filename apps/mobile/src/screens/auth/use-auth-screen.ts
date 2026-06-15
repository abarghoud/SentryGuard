import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, ScrollView } from 'react-native';

import { apiUrlStore, virtualKeyStore } from '../../core/api';
import { normalizeDomain } from '../../core/config/app-domain';
import { getTeslaLoginUrlUseCase, demoLoginUseCase } from '../../features/auth/di';
import { extractTokenFromCallbackUrl } from './auth.helpers';

export interface UseAuthScreenParams {
  onAuthenticated(token: string): Promise<void>;
}

export interface UseAuthScreenResult {
  message: string | null;
  isAuthenticating: boolean;
  isAdvancedVisible: boolean;
  apiUrl: string;
  virtualKeyPairingUrl: string;
  isDemoFormVisible: boolean;
  demoEmail: string;
  demoPassword: string;
  isDemoLoggingIn: boolean;
  scrollViewRef: React.RefObject<ScrollView | null>;
  openTeslaLogin(): Promise<void>;
  handleDemoSubmit(): Promise<void>;
  revealAdvancedSettings(): void;
  saveAdvancedSettings(): Promise<void>;
  resetAdvancedSettings(): Promise<void>;
  setIsDemoFormVisible(visible: boolean): void;
  setDemoEmail(email: string): void;
  setDemoPassword(password: string): void;
  setApiUrl(url: string): void;
  setVirtualKeyPairingUrl(url: string): void;
  scrollToAdvancedSettings(): void;
}

export function useAuthScreen({ onAuthenticated }: UseAuthScreenParams): UseAuthScreenResult {
  const { t } = useTranslation();
  const [message, setMessage] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAdvancedVisible, setIsAdvancedVisible] = useState(false);
  const [advancedTapCount, setAdvancedTapCount] = useState(0);
  const [apiUrl, setApiUrl] = useState(apiUrlStore.getCustomUrl());
  const [virtualKeyPairingUrl, setVirtualKeyPairingUrl] = useState(virtualKeyStore.getCustomUrl());
  const [isDemoFormVisible, setIsDemoFormVisible] = useState(false);
  const [demoEmail, setDemoEmail] = useState('');
  const [demoPassword, setDemoPassword] = useState('');
  const [isDemoLoggingIn, setIsDemoLoggingIn] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

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

  const openTeslaAuthUrl = (url: string): Promise<void> => {
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
  };

  const handleDemoSubmit = async (): Promise<void> => {
    try {
      setIsDemoLoggingIn(true);
      setMessage(null);
      await applyPendingAdvancedSettings();
      const response = await demoLoginUseCase.execute({
        email: demoEmail.trim(),
        password: demoPassword,
      });
      void onAuthenticated(response.jwt);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('auth.demo.error'));
    } finally {
      setIsDemoLoggingIn(false);
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

  return {
    message,
    isAuthenticating,
    isAdvancedVisible,
    apiUrl,
    virtualKeyPairingUrl,
    isDemoFormVisible,
    demoEmail,
    demoPassword,
    isDemoLoggingIn,
    scrollViewRef,
    openTeslaLogin,
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
  };
}
