'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../features/auth/presentation/hooks/use-auth';
import { useConsent } from '../../features/consent/presentation/hooks/use-consent';
import { useOnboarding } from '../../features/onboarding/presentation/hooks/use-onboarding';
import OnboardingWizard from '../../components/onboarding/OnboardingWizard';

export default function OnboardingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { status, isLoading: consentLoading } = useConsent();
  const hasConsent = status?.hasConsent ?? false;
  const { isComplete } = useOnboarding();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/');
      return;
    }

    if (!consentLoading && isAuthenticated && !hasConsent) {
      router.push('/consent');
      return;
    }

    if (!authLoading && !consentLoading && isComplete) {
      router.push('/dashboard');
      return;
    }
  }, [isAuthenticated, hasConsent, isComplete, authLoading, consentLoading, router]);

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
