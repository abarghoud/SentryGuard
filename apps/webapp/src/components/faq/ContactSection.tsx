import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export function ContactSection() {
  const { t } = useTranslation('common');

  const openCrispChat = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((window as any).$crisp) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).$crisp.push(['do', 'chat:open']);
    } else {
      console.warn('Crisp chat not available');
    }
  }, []);

  return (
    <div className="mt-12 rounded-2xl shadow-sm border p-8 md:p-10 text-center bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
      <div className="max-w-2xl mx-auto">
        <h3 className="text-2xl font-semibold mb-3 text-gray-900 dark:text-white">
          {t('Still have questions?')}
        </h3>
        <p className="mb-8 text-base text-gray-600 dark:text-gray-400">
          {t(
            'Can\'t find the answer you\'re looking for? Please feel free to contact us.'
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={openCrispChat}
            className="inline-flex items-center justify-center px-6 py-3 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md transform hover:scale-105 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white"
          >
            {t('Contact Support')}
          </button>
          <a
            href="https://github.com/abarghoud/SentryGuard"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg transition-all duration-200 font-medium shadow-sm hover:shadow-md bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
            {t('GitHub')}
          </a>
        </div>
      </div>
    </div>
  );
}