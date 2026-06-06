import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Platform } from 'react-native';

import { getAuthProfileUseCase } from '../../features/auth/di';
import {
  getNotificationPreferencesUseCase,
  pushNotificationService,
  updateNotificationPreferencesUseCase,
} from '../../features/notifications/di';
import { NotificationPreferences } from '../../features/notifications/domain/entities';
import { generateTelegramLinkUseCase, getTelegramStatusUseCase } from '../../features/telegram/di';
import { getUserLanguageUseCase, updateUserLanguageUseCase } from '../../features/user/di';
import { UserLanguage } from '../../features/user/domain/entities';
import {
  canEnableCriticalAlerts,
  defaultPreferences,
  registerDeviceForPush,
  requiresPushDevice,
  resolvePreferenceUpdates,
  resolveSettingsError,
} from './settings.helpers';

interface UpdateNotificationPreferencesMutation {
  preferences: Partial<NotificationPreferences>;
  token?: string;
}

export function useSettings() {
  const { i18n, t } = useTranslation();
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);
  const [isDndAccessModalOpen, setIsDndAccessModalOpen] = useState(false);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isTokenResolved, setIsTokenResolved] = useState(false);
  const hasRegisteredPushToken = useRef(false);
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryFn: () => getAuthProfileUseCase.execute(),
    queryKey: ['auth-profile'],
  });
  const preferencesQuery = useQuery({
    enabled: isTokenResolved,
    placeholderData: keepPreviousData,
    queryFn: () => getNotificationPreferencesUseCase.execute(pushToken ?? undefined),
    queryKey: ['notification-preferences', pushToken],
    staleTime: 5 * 60 * 1000,
  });
  const languageQuery = useQuery({
    queryFn: () => getUserLanguageUseCase.execute(),
    queryKey: ['user-language'],
  });
  const telegramStatusQuery = useQuery({
    queryFn: () => getTelegramStatusUseCase.execute(),
    queryKey: ['telegram-status'],
  });
  const preferencesMutation = useMutation({
    mutationFn: ({ preferences, token }: UpdateNotificationPreferencesMutation) =>
      updateNotificationPreferencesUseCase.execute(preferences, token),
    onSuccess: (preferences, variables) => {
      queryClient.setQueryData(['notification-preferences', variables.token ?? pushToken], preferences);
    },
  });
  const languageMutation = useMutation({
    mutationFn: (language: UserLanguage) => updateUserLanguageUseCase.execute(language),
    onSuccess: async (language) => {
      await i18n.changeLanguage(language.language);
      queryClient.setQueryData(['user-language'], language);
    },
  });
  const telegramLinkMutation = useMutation({
    mutationFn: () => generateTelegramLinkUseCase.execute(),
    onSuccess: async (linkInfo) => {
      await Linking.openURL(linkInfo.link);
      setPreferenceMessage(t('settings.telegramLinkReturn'));
    },
  });

  useEffect(() => {
    const language = languageQuery.data?.language;
    if (language && i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [i18n, languageQuery.data?.language]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
      }
    });

    return () => subscription.remove();
  }, [queryClient]);

  useEffect(() => {
    let isActive = true;

    void pushNotificationService
      .getCachedExpoPushToken()
      .then((cachedToken) => {
        if (isActive && cachedToken) {
          setPushToken(cachedToken);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isActive) {
          setIsTokenResolved(true);
        }
      });

    void pushNotificationService
      .getGrantedExpoPushToken()
      .then((freshToken) => {
        if (isActive && freshToken) {
          setPushToken(freshToken);
        }
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!preferencesQuery.data?.push_enabled || hasRegisteredPushToken.current || Platform.OS === 'web') {
      return;
    }

    void registerDeviceForPush(undefined, t).then((token) => {
      hasRegisteredPushToken.current = Boolean(token);
      setPushToken(token);
    });
  }, [preferencesQuery.data?.push_enabled, t]);

  const resolvePushTokenForUpdate = async (
    updates: Partial<NotificationPreferences>
  ): Promise<string | undefined | false> => {
    let currentPushToken = pushToken ?? undefined;

    const needsRegistration =
      updates.push_enabled === true || (requiresPushDevice(updates) && !currentPushToken && Platform.OS !== 'web');

    if (!needsRegistration) {
      return currentPushToken;
    }

    try {
      const registeredToken = await registerDeviceForPush(setPreferenceMessage, t);
      if (!registeredToken) {
        setPreferenceMessage(
          updates.push_enabled === true && Platform.OS === 'web' ? t('settings.pushNativeOnly') : t('settings.pushNoToken')
        );
        return false;
      }
      currentPushToken = registeredToken;
      setPushToken(registeredToken);
      return currentPushToken;
    } catch {
      setPreferenceMessage(t('settings.pushError'));
      return false;
    }
  };

  const updatePreference = async (updates: Partial<NotificationPreferences>): Promise<void> => {
    setPreferenceMessage(null);

    const queryKey = ['notification-preferences', pushToken];
    const previousPreferences = queryClient.getQueryData<NotificationPreferences>(queryKey) ?? defaultPreferences;
    const rollback = (): void => {
      queryClient.setQueryData(queryKey, previousPreferences);
    };

    // Optimistic: reflect the toggle immediately, before any network/registration work.
    queryClient.setQueryData(queryKey, { ...previousPreferences, ...resolvePreferenceUpdates(updates) });

    const currentPushToken = await resolvePushTokenForUpdate(updates);

    if (currentPushToken === false) {
      rollback();
      return;
    }

    if (updates.critical_alerts_enabled === true && !(await canEnableCriticalAlerts(setIsDndAccessModalOpen))) {
      rollback();
      return;
    }

    try {
      const preferences = await preferencesMutation.mutateAsync({
        preferences: resolvePreferenceUpdates(updates),
        token: currentPushToken,
      });

      if (updates.critical_alerts_enabled === true && !preferences.critical_alerts_enabled) {
        setPreferenceMessage(t('settings.criticalAlertsUnavailable'));
      }
    } catch (error) {
      rollback();
      setPreferenceMessage(resolveSettingsError(error, t));
    }
  };

  return {
    isDndAccessModalOpen,
    isTelegramLinked: telegramStatusQuery.data?.linked === true,
    languageMutation,
    languageQuery,
    preferenceMessage,
    preferences: preferencesQuery.data ?? defaultPreferences,
    preferencesMutation,
    preferencesQuery,
    profile: profileQuery.data?.profile,
    setIsDndAccessModalOpen,
    telegramLinkMutation,
    updatePreference,
  };
}
