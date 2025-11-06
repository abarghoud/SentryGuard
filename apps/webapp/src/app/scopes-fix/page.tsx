'use client';

import { useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getScopeChangeUrl } from '../../lib/api';
import MissingScopesBanner from '../../components/MissingScopesBanner';
import LanguageSwitcher from '../../components/LanguageSwitcher';

function ScopesFixContent() {
  const { t } = useTranslation('common');
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const missingScopes = searchParams.get('missing')?.split(',') || [];

  const handleFixPermissions = async () => {
    setIsLoading(true);
    try {
      const { url } = await getScopeChangeUrl(missingScopes);
      window.location.href = url;
    } catch (error) {
      console.error('Failed to get scope change URL:', error);
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('Permission Update Required')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('TeslaGuard needs additional permissions to work properly')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <MissingScopesBanner
            missingScopes={missingScopes}
            onFixClick={handleFixPermissions}
            isLoading={isLoading}
          />

          <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
            <p>
              {t(
                'Click "Fix Permissions" to re-authenticate with Tesla and grant the required permissions. You\'ll be redirected back here automatically.'
              )}
            </p>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {t('← Back to home')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function ScopesFixPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Permission Update Required
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Loading...
              </p>
            </div>
          </div>
        </main>
      }
    >
      <ScopesFixContent />
    </Suspense>
  );
}
