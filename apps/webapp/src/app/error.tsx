'use client'; // Error components must be Client Components

import { useEffect, useState } from 'react';
import { useRollbar } from '@rollbar/react';
import { useTranslation } from 'react-i18next';
import Spinner from '../components/Spinner';

interface ErrorProps {
  error: Error;
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  const { t } = useTranslation('common');
  const rollbar = useRollbar();
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    rollbar.error(error, {
      url: typeof window !== 'undefined' ? window.location.href : '',
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : '',
      timestamp: new Date().toISOString(),
    });
  }, [error, rollbar]);

  const handleReset = async () => {
    setIsResetting(true);
    try {
      await reset();
    } finally {
      setIsResetting(false);
    }
  };

  const isDevelopment = process.env.NODE_ENV === 'development';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 px-4">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-xl p-8 text-center">
        {/* Icône d'erreur */}
        <div className="mb-6">
          <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-red-600 dark:text-red-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          {t('Something went wrong')}
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-6">
          {t('We encountered an unexpected error. Please try refreshing the page.')}
        </p>

        {isDevelopment && (
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 mb-6 text-left">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Error Details (Development):
            </h3>
            <pre className="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap break-words">
              {error?.message || 'Unknown error'}
              {error?.stack && `\n\n${error.stack}`}
            </pre>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleReset}
            disabled={isResetting}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isResetting ? (
              <>
                <Spinner className="w-4 h-4" />
                {t('Reloading...')}
              </>
            ) : (
              t('Try Again')
            )}
          </button>

          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium py-2 px-4 rounded-lg transition-colors duration-200"
          >
            {t('← Back to home')}
          </button>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-6">
          {t('If the problem persists, please contact support.')}
        </p>
      </div>
    </div>
  );
}
