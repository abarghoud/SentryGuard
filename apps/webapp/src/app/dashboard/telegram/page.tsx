'use client';

import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../../lib/useTelegram';
import TelegramLinkCard from '../../../components/TelegramLinkCard';

export default function TelegramPage() {
  const { t } = useTranslation('common');
  const {
    status,
    linkInfo,
    isLoading,
    error,
    fetchStatus,
    generateLink,
    unlink,
    sendTest,
  } = useTelegram();

  if (isLoading && !status) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tesla-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('Telegram Configuration')}
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          {t('Link your Telegram account to receive instant vehicle alerts')}
        </p>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-red-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-3xl">
        <TelegramLinkCard
          status={status}
          linkInfo={linkInfo}
          onGenerateLink={generateLink}
          onUnlink={unlink}
          onSendTest={sendTest}
          onRefresh={fetchStatus}
        />

        {/* How it Works */}
        <div className="mt-8 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('How It Works')}
          </h3>
          <ol className="space-y-4">
            <li className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-tesla-600 text-white font-semibold">
                  1
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t('Generate Link')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t(
                    'Click "Generate Telegram Link" to create a unique connection link that expires in 15 minutes.'
                  )}
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-tesla-600 text-white font-semibold">
                  2
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t('Open Telegram')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t(
                    'Click the link to open our Telegram bot. The bot will automatically send a /start command with your unique token.'
                  )}
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-tesla-600 text-white font-semibold">
                  3
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t('Confirm Connection')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t(
                    'Your account will be linked instantly. Return to this page to see the confirmation and send a test message.'
                  )}
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-semibold">
                  ✓
                </div>
              </div>
              <div>
                <h4 className="font-medium text-gray-900 dark:text-white">
                  {t('Receive Alerts')}
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {t(
                    "You're all set! You'll now receive instant Telegram notifications when your vehicle's Sentry Mode is triggered."
                  )}
                </p>
              </div>
            </li>
          </ol>
        </div>

        {/* Security Notice */}
        <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex">
            <svg
              className="h-5 w-5 text-yellow-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                {t('Privacy & Security')}
              </h3>
              <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                <p>
                  {t(
                    'Your Telegram chat ID is securely stored and only used to send you vehicle alerts. You can unlink your account at any time, and all associated data will be removed.'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
