'use client';

import { useTranslation } from 'react-i18next';

export function BreakInOffensiveResponseHeader() {
  const { t } = useTranslation('common');

  return (
    <div className="mb-8 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-indigo-100 dark:bg-indigo-900/40 mb-4">
        <svg className="w-7 h-7 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {t('New features available')}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 max-w-md mx-auto">
        {t('SentryGuard has new advanced security capabilities to better protect your Tesla.')}
      </p>
    </div>
  );
}

export function BreakInOffensiveResponseContent() {
  const { t } = useTranslation('common');

  return (
    <>
      <div className="flex gap-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/60">
          <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {t('Break-in Monitoring')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('Detects intrusion attempts on your vehicle. You receive an instant Telegram alert as soon as a break-in attempt is detected.')}
          </p>
        </div>
      </div>

      <div className="flex gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
        <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/60">
          <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            {t('Offensive Response (Horn)')}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            {t('When the offensive response is active, your vehicle horn triggers automatically upon detection to deter intruders immediately.')}
          </p>
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          {t('💡 These features are available in the Vehicles section. You can enable break-in monitoring and configure the offensive response for each vehicle independently.')}
        </p>
      </div>
    </>
  );
}
