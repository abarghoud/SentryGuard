import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { usePushTokenSync } from '../../core/hooks/usePushTokenSync';
import { useTelegramStatusSync } from '../../core/hooks/useTelegramStatusSync';
import { acceptConsentUseCase, getConsentStatusUseCase, getConsentTextUseCase } from '../../features/consent/di';
import { completeOnboardingUseCase, getOnboardingStatusUseCase, skipOnboardingUseCase } from '../../features/onboarding/di';
import { getNotificationPreferencesUseCase } from '../../features/notifications/di';
import { getTelegramStatusUseCase } from '../../features/telegram/di';
import { getUserLanguageUseCase } from '../../features/user/di';
import { UserLanguage } from '../../features/user/domain/entities';
import { configureTelemetryUseCase, getVehiclesUseCase } from '../../features/vehicles/di';
import { registerDeviceForPush } from '../settings/settings.helpers';

export function useOnboarding(onComplete: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const { pushToken, setPushToken } = usePushTokenSync();
  useTelegramStatusSync();

  const languageQuery = useQuery({ queryFn: () => getUserLanguageUseCase.execute(), queryKey: ['user-language'] });
  const selectedLanguage = languageQuery.data?.language ?? UserLanguage.French;
  const consentStatusQuery = useQuery({ queryFn: () => getConsentStatusUseCase.execute(), queryKey: ['consent-status'] });
  const consentTextQuery = useQuery({
    queryFn: () => getConsentTextUseCase.execute(selectedLanguage),
    queryKey: ['consent-text', selectedLanguage],
  });
  const onboardingQuery = useQuery({ queryFn: () => getOnboardingStatusUseCase.execute(), queryKey: ['onboarding-status'] });
  const vehiclesQuery = useQuery({
    enabled: consentStatusQuery.data?.hasConsent === true,
    queryFn: () => getVehiclesUseCase.execute(),
    queryKey: ['vehicles'],
  });

  const telegramStatusQuery = useQuery({
    enabled: consentStatusQuery.data?.hasConsent === true,
    queryFn: () => getTelegramStatusUseCase.execute(),
    queryKey: ['telegram-status'],
  });

  const preferencesQuery = useQuery({
    enabled: consentStatusQuery.data?.hasConsent === true,
    queryFn: () => getNotificationPreferencesUseCase.execute(pushToken ?? undefined),
    queryKey: ['notification-preferences', pushToken],
  });

  const acceptConsentMutation = useMutation({
    mutationFn: acceptConsentUseCase.execute.bind(acceptConsentUseCase),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['consent-status'] });
      setMessage(null);
    },
  });
  const telemetryMutation = useMutation({
    mutationFn: (vin: string) => configureTelemetryUseCase.execute(vin),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setMessage(null);
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const completeMutation = useMutation({
    mutationFn: () => completeOnboardingUseCase.execute(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      onComplete();
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const skipMutation = useMutation({
    mutationFn: () => skipOnboardingUseCase.execute(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      onComplete();
    },
  });

  const handleEnablePush = async (): Promise<void> => {
    setMessage(null);
    try {
      const token = await registerDeviceForPush(setMessage, t);
      if (token) {
        setPushToken(token);
        await queryClient.invalidateQueries({ queryKey: ['notification-preferences'] });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const vehicles = vehiclesQuery.data ?? [];
  const telemetryVehicle = vehicles.find((vehicle) => !vehicle.sentry_mode_monitoring_enabled) ?? vehicles[0] ?? null;

  const isTelegramLinked = telegramStatusQuery.data?.linked === true;
  const isPushEnabled = preferencesQuery.data?.push_enabled === true;
  const isNotificationConfigured = isTelegramLinked || isPushEnabled;

  return {
    acceptConsentMutation,
    completeMutation,
    consentStatusQuery,
    consentTextQuery,
    enablePush: handleEnablePush,
    flags: {
      isConsentMissing: consentStatusQuery.data?.hasConsent !== true,
      isLoading:
        consentStatusQuery.isLoading ||
        onboardingQuery.isLoading ||
        consentTextQuery.isLoading ||
        (consentStatusQuery.data?.hasConsent === true && (telegramStatusQuery.isLoading || preferencesQuery.isLoading)),
      isNotificationConfigMissing: !isNotificationConfigured,
      isTelemetryMissing: vehicles.length > 0 && !vehicles.some((vehicle) => vehicle.sentry_mode_monitoring_enabled),
      isVehicleMissing: vehicles.length === 0,
      isVirtualKeyMissing: vehicles.length > 0 && !vehicles.some((vehicle) => vehicle.key_paired),
    },
    isPushActive: isPushEnabled,
    isTelegramLinked,
    message,
    onboardingQuery,
    setMessage,
    skipMutation,
    t,
    telemetryMutation,
    telemetryVehicle,
    vehicles,
    vehiclesQuery,
  };
}
