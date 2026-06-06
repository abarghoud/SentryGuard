import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { acceptConsentUseCase, getConsentStatusUseCase, getConsentTextUseCase } from '../../features/consent/di';
import { completeOnboardingUseCase, getOnboardingStatusUseCase, skipOnboardingUseCase } from '../../features/onboarding/di';
import { getUserLanguageUseCase } from '../../features/user/di';
import { UserLanguage } from '../../features/user/domain/entities';
import { configureTelemetryUseCase, getVehiclesUseCase } from '../../features/vehicles/di';

export function useOnboarding(onComplete: () => void) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

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

  const vehicles = vehiclesQuery.data ?? [];
  const telemetryVehicle = vehicles.find((vehicle) => !vehicle.sentry_mode_monitoring_enabled) ?? vehicles[0] ?? null;

  return {
    acceptConsentMutation,
    completeMutation,
    consentStatusQuery,
    consentTextQuery,
    flags: {
      isConsentMissing: consentStatusQuery.data?.hasConsent !== true,
      isLoading: consentStatusQuery.isLoading || onboardingQuery.isLoading || consentTextQuery.isLoading,
      isTelemetryMissing: vehicles.length > 0 && !vehicles.some((vehicle) => vehicle.sentry_mode_monitoring_enabled),
      isVehicleMissing: vehicles.length === 0,
      isVirtualKeyMissing: vehicles.length > 0 && !vehicles.some((vehicle) => vehicle.key_paired),
    },
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
