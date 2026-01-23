'use client';

import { useTranslation } from 'react-i18next';

export default function OnboardingSuccessScreen() {
  const { t } = useTranslation('common');

  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
        <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {t('Setup Complete!')}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {t('Your SentryGuard is now fully configured. You will receive instant Telegram alerts when suspicious activity is detected.')}
      </p>
      <a
        href="/dashboard"
        className="inline-flex items-center justify-center px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors duration-200"
      >
        {t('Go to Dashboard')}
      </a>
    </div>
  );
}
