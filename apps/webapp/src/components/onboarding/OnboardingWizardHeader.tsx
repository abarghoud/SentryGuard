'use client';

import { useTranslation } from 'react-i18next';

export default function OnboardingWizardHeader() {
  const { t } = useTranslation('common');

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/sentry-guard-logo.svg" alt="SentryGuard Logo" className="w-10 h-10" />
          <span className="text-lg font-bold text-gray-900 dark:text-white">
            {t('SentryGuard')}
          </span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {t('Setup Wizard')}
        </div>
      </div>
    </div>
  );
}
