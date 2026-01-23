'use client';

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import OnboardingStepLayout from './OnboardingStepLayout';

const TESLA_APP_URL = 'https://www.tesla.com/_ak/ws.sentryguard.org';

interface VirtualKeySetupStepProps {
  onContinue?: () => void;
}

export default function VirtualKeySetupStep({ onContinue }: VirtualKeySetupStepProps) {
  const { t } = useTranslation('common');
  const [hasOpenedApp, setHasOpenedApp] = useState(false);

  const handleOpenTeslaApp = useCallback(() => {
    setHasOpenedApp(true);
  }, []);

  const handleContinue = useCallback(() => {
    if (onContinue) {
      onContinue();
    }
  }, [onContinue]);

  return (
    <OnboardingStepLayout
      title={t('Set Up Virtual Key')}
      description={t('Pair a virtual key with your vehicle in the Tesla app')}
      stepNumber={2}
      totalSteps={4}
    >
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('🔐 This action happens entirely in the Tesla app. Once finished, return to SentryGuard to continue.')}
          </p>
        </div>

        <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
            {t('How to pair a virtual key:')}
          </h3>
          <ol className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-xs">
                1
              </span>
              <span>{t('Click "Open Tesla App" button below')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-xs">
                2
              </span>
              <span>{t('The Tesla app will open and show a confirmation dialog')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-xs">
                3
              </span>
              <span>{t('Approve the virtual key request in the Tesla app')}</span>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-medium text-xs">
                4
              </span>
              <span>{t('Return to SentryGuard to continue setup')}</span>
            </li>
          </ol>
        </div>

        <a
          href={TESLA_APP_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={handleOpenTeslaApp}
          className="block w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-center"
        >
          {t('Open Tesla App')}
        </a>

        {hasOpenedApp && (
          <button
            onClick={handleContinue}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
          >
            {t('I\'ve opened the Tesla app')}
          </button>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            {t('⏱️ Once you\'ve opened the Tesla app and approved the virtual key, click the button above to continue.')}
          </p>
        </div>
      </div>
    </OnboardingStepLayout>
  );
}
