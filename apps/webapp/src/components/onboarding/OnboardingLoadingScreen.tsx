'use client';

import { useTranslation } from 'react-i18next';

export default function OnboardingLoadingScreen() {
  const { t } = useTranslation('common');

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">{t('Loading...')}</p>
      </div>
    </div>
  );
}
