'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingStep } from '../../features/onboarding/domain/entities';
import { useOnboardingQuery } from '../../features/onboarding/di';
import { useOnboardingStep } from '../../features/onboarding/presentation/hooks/use-onboarding-step';
import TelegramLinkStep from './TelegramLinkStep';
import VirtualKeySetupStep from './VirtualKeySetupStep';
import TelemetryActivationStep from './TelemetryActivationStep';
import FeatureDiscoveryStep from './FeatureDiscoveryStep';
import OnboardingLoadingScreen from './OnboardingLoadingScreen';
import OnboardingSuccessScreen from './OnboardingSuccessScreen';
import SkipOnboardingButton from './SkipOnboardingButton';
import OnboardingWizardHeader from './OnboardingWizardHeader';

const REDIRECT_DELAY_MS = 2000;

export default function OnboardingWizard() {
  const router = useRouter();
  const { query, skipOnboardingMutation } = useOnboardingQuery();
  const { data: onboardingData, isLoading: isOnboardingLoading, refetch: checkStatus } = query;
  const isComplete = onboardingData?.isComplete ?? false;
  const pendingAnnouncementKey = onboardingData?.pendingAnnouncementKey ?? null;

  const wasAlreadyCompleteRef = useRef<boolean | null>(null);
  if (!isOnboardingLoading && onboardingData && wasAlreadyCompleteRef.current === null) {
    wasAlreadyCompleteRef.current = isComplete;
  }
  const wasAlreadyComplete = wasAlreadyCompleteRef.current ?? false;

  const skipOnboarding = async () => {
    try {
      await skipOnboardingMutation.mutateAsync();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };
  const { currentStep, refreshAll, isLoading: isStepLoading } = useOnboardingStep();

  const [isSkipping, setIsSkipping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasRedirected = useRef(false);

  const shouldRedirect = isComplete && pendingAnnouncementKey === null;

  useEffect(() => {
    if (shouldRedirect && !hasRedirected.current) {
      hasRedirected.current = true;
      const delay = wasAlreadyComplete ? 0 : REDIRECT_DELAY_MS;
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, delay);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [shouldRedirect, wasAlreadyComplete, router]);

  const handleSkipOnboarding = useCallback(async () => {
    setIsSkipping(true);
    try {
      const result = await skipOnboarding();
      if (!result.success) {
        console.error('Failed to skip onboarding:', result.error);
      }
    } finally {
      setIsSkipping(false);
    }
  }, [skipOnboarding]);

  const handleContinue = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([checkStatus(), refreshAll()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [checkStatus, refreshAll]);

  const renderStep = () => {
    if (pendingAnnouncementKey !== null) {
      return (
        <FeatureDiscoveryStep
          announcementKey={pendingAnnouncementKey}
          onDismissed={handleContinue}
        />
      );
    }

    if (currentStep === OnboardingStep.TELEGRAM_LINK) {
      return <TelegramLinkStep onContinue={handleContinue} />;
    }

    if (currentStep === OnboardingStep.VIRTUAL_KEY_SETUP) {
      return <VirtualKeySetupStep onContinue={handleContinue} />;
    }

    if (currentStep === OnboardingStep.TELEMETRY_ACTIVATION) {
      return <TelemetryActivationStep onCompleted={handleContinue} />;
    }

    return null;
  };

  const renderContent = () => {
    if (pendingAnnouncementKey !== null) {
      return renderStep();
    }

    return (
      <>
        {renderStep()}
        <SkipOnboardingButton disabled={isSkipping} onSkip={handleSkipOnboarding} />
      </>
    );
  };

  if (isOnboardingLoading || isStepLoading || isRefreshing) {
    return <OnboardingLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <OnboardingWizardHeader />
      <div className="min-h-[calc(100vh-100px)] py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {shouldRedirect && !wasAlreadyComplete ? <OnboardingSuccessScreen /> : renderContent()}
        </div>
      </div>
    </div>
  );
}
