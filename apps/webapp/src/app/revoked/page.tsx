'use client';

import { useTranslation } from 'react-i18next';
import TeslaLoginButton from '../../components/TeslaLoginButton';
import LanguageSwitcher from '../../components/LanguageSwitcher';

export default function RevokedPage() {
  const { t } = useTranslation('common');

  return (
    <main className="min-h-screen bg-gray-50 text-black">
      <nav className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-8 h-8 text-red-600"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 5.362l2.475-3.026h-4.95L12 5.362zm-2.475 4.07L7.05 6.406 2.475 11.93h7.05v-2.5zm4.95 0v2.5h7.05l-4.575-5.525-2.475 3.025zM12 14.407l2.475 3.025 2.475-3.025H12zm-6.525-2.407L2 19.594h9V12H5.475zm13.05 0H14v7.594h9L19.525 12z" />
            </svg>
            <h1 className="text-2xl font-bold">{t('SentryGuard')}</h1>
          </div>
          <LanguageSwitcher />
        </div>
      </nav>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="text-center">
              {/* Warning icon */}
              <div className="mx-auto h-16 w-16 text-yellow-600 mb-6">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>

              <h1 className="text-3xl font-bold text-gray-900 mb-4">
                {t('Tesla Authorization Revoked')}
              </h1>

              <p className="text-gray-600 mb-6">
                {t(
                  'Your Tesla account access has been removed. This typically happens when:'
                )}
              </p>

              <ul className="text-left text-gray-600 mb-6 space-y-2 max-w-md mx-auto">
                <li>• {t('You removed SentryGuard from your Tesla account')}</li>
                <li>• {t('You changed your Tesla account password')}</li>
                <li>
                  • {t('Tesla security policies required re-authorization')}
                </li>
              </ul>

              <p className="text-gray-600 mb-8">
                {t('To continue using SentryGuard, please reconnect your Tesla account.')}
              </p>

              <TeslaLoginButton />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
