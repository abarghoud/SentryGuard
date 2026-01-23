'use client';

import { useMemo, useCallback } from 'react';
import { OnboardingStep } from './useOnboarding';
import { useTelegram } from './useTelegram';
import { useVehicles } from './useVehicles';

interface TelegramStatus {
  linked: boolean;
}

interface Vehicle {
  key_paired?: boolean;
}

function getTelegramLinkStatus(status: TelegramStatus | undefined | null): boolean {
  return status?.linked ?? false;
}

function getVirtualKeyPairStatus(vehicles: readonly Vehicle[]): boolean {
  return vehicles.some((vehicle) => vehicle.key_paired === true);
}

export function useOnboardingStep() {
  const { status: telegramStatus, fetchStatus: fetchTelegramStatus, isLoading: isTelegramLoading } = useTelegram();
  const { vehicles, fetchVehicles, isLoading: isVehiclesLoading } = useVehicles();

  const isTelegramLinked = getTelegramLinkStatus(telegramStatus);
  const isVirtualKeyPaired = getVirtualKeyPairStatus(vehicles);

  const currentStep = useMemo<OnboardingStep>(() => {
    if (!isTelegramLinked) {
      return OnboardingStep.TELEGRAM_LINK;
    }

    if (!isVirtualKeyPaired) {
      return OnboardingStep.VIRTUAL_KEY_SETUP;
    }

    return OnboardingStep.TELEMETRY_ACTIVATION;
  }, [isTelegramLinked, isVirtualKeyPaired]);

  const refreshAll = useCallback(async () => {
    await Promise.all([fetchTelegramStatus(), fetchVehicles()]);
  }, [fetchTelegramStatus, fetchVehicles]);

  const isLoading = isTelegramLoading || isVehiclesLoading;

  return {
    currentStep,
    isTelegramLinked,
    isVirtualKeyPaired,
    refreshAll,
    isLoading,
  };
}
