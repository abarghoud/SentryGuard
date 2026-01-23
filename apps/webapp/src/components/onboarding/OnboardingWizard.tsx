'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { OnboardingStep } from '../../lib/useOnboarding';
import { useOnboarding } from '../../lib/useOnboarding';
import { useOnboardingStep } from '../../lib/useOnboardingStep';
import TelegramLinkStep from './TelegramLinkStep';
import VirtualKeySetupStep from './VirtualKeySetupStep';
import TelemetryActivationStep from './TelemetryActivationStep';
import OnboardingLoadingScreen from './OnboardingLoadingScreen';
import OnboardingSuccessScreen from './OnboardingSuccessScreen';
import SkipOnboardingButton from './SkipOnboardingButton';
import OnboardingWizardHeader from './OnboardingWizardHeader';

const REDIRECT_DELAY_MS = 2000;

export default function OnboardingWizard() {
  const router = useRouter();
  const { isLoading: isOnboardingLoading, skipOnboarding, isComplete, checkStatus } = useOnboarding();
  const { currentStep, refreshAll, isLoading: isStepLoading } = useOnboardingStep();

  const [isSkipping, setIsSkipping] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isComplete && !hasRedirected.current) {
      hasRedirected.current = true;
      const timer = setTimeout(() => {
        router.push('/dashboard');
      }, REDIRECT_DELAY_MS);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isComplete, router]);

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

  const renderStepWithSkip = () => (
    <>
      {renderStep()}
      <SkipOnboardingButton disabled={isSkipping} onSkip={handleSkipOnboarding} />
    </>
  );

  if (isOnboardingLoading || isStepLoading || isRefreshing) {
    return <OnboardingLoadingScreen />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <OnboardingWizardHeader />
      <div className="min-h-[calc(100vh-100px)] py-8">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {isComplete ? <OnboardingSuccessScreen /> : renderStepWithSkip()}
        </div>
      </div>
    </div>
  );
}
