'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthQuery } from '../../features/auth/di';
import { useConsentQuery } from '../../features/consent/di';
import { useOnboardingQuery } from '../../features/onboarding/di';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  const router = useRouter();
  const { query: authQuery } = useAuthQuery();
  const { data: authData, isLoading: authLoading } = authQuery;
  const isAuthenticated = authData?.status.authenticated ?? false;
  const { query: consentQuery } = useConsentQuery();
  const { data: status, isLoading: consentLoading } = consentQuery;
  const hasConsent = status?.hasConsent ?? false;
  const { query: onboardingQuery } = useOnboardingQuery();
  const { data: onboardingData, isLoading: onboardingLoading } = onboardingQuery;
  const isComplete = onboardingData?.isComplete ?? false;
  const pendingAnnouncementKey = onboardingData?.pendingAnnouncementKey ?? null;

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    if (!consentLoading && isAuthenticated && !hasConsent) {
      router.push('/consent');
      return;
    }

    if (
      !authLoading &&
      !consentLoading &&
      !onboardingLoading &&
      isComplete &&
      pendingAnnouncementKey === null
    ) {
      router.push('/dashboard');
      return;
    }
  }, [
    isAuthenticated,
    hasConsent,
    isComplete,
    pendingAnnouncementKey,
    authLoading,
    consentLoading,
    onboardingLoading,
    router,
  ]);

  if (authLoading || consentLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
      </div>
    );
  }

  if (!isAuthenticated || !hasConsent) {
    return null;
  }

  return <OnboardingWizard />;
}
