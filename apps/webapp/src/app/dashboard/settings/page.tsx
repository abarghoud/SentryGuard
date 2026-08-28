'use client';


import { useTranslation } from 'react-i18next';
import { useAuthQuery } from '../../../features/auth/di';
import { useConsentQuery } from '../../../features/consent/di';
import { useRouter } from 'next/navigation';

export default function SettingsPage() {
  const { i18n, t } = useTranslation('common');
  const { query: authQuery, logoutMutation } = useAuthQuery();
  const profile = authQuery.data?.profile;
  const router = useRouter();

  const { revokeConsentMutation } = useConsentQuery();


  const handleDeleteAccount = async () => {
    if (
      window.confirm(
        t('Delete account confirmation')
      )
    ) {
      try {
        await revokeConsentMutation.mutateAsync();
        await logoutMutation.mutateAsync();
        router.push('/');
      } catch (error) {
        console.error('Revoke consent failed:', error);
      }
    }
  };

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
            {t('Settings')}
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {t('Manage your account settings and preferences')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white">
              {t('Account Information')}
            </h2>
          </div>
          <div className="px-4 sm:px-6 py-5">
            <dl className="space-y-4 sm:space-y-5">
              {profile?.full_name ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('Name')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white break-words">
                    {profile.full_name}
                  </dd>
                </div>
              ) : null}
              {profile?.email ? (
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('Email')}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white break-words">
                    {profile.email}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg mb-6 overflow-hidden border border-amber-200/70 dark:border-amber-900/40">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-amber-200/70 dark:border-amber-900/40 bg-gradient-to-r from-amber-50 to-orange-50/30 dark:from-amber-950/20 dark:to-orange-950/10 flex items-center gap-2">
            <span className="text-lg">❤️</span>
            <h2 className="text-base sm:text-lg font-medium text-amber-950 dark:text-amber-300">
              {t('Community Wall of Fame')}
            </h2>
          </div>
          <div className="px-4 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t('Discover all community members and donors supporting SentryGuard or buy us a coffee.')}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <a
                  href={`/${i18n.language || 'fr'}/supporters`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                  <span>{t('View Wall of Fame')}</span>
                  <span>→</span>
                </a>
                <a
                  href="https://buymeacoffee.com/sentryguardorg"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors"
                >
                  <span>☕</span>
                  <span>{t('Buy us a coffee')}</span>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 shadow rounded-lg border-2 border-red-200 dark:border-red-900">
          <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/10">
            <h2 className="text-base sm:text-lg font-medium text-red-900 dark:text-red-400">
              {t('Danger Zone')}
            </h2>
          </div>
          <div className="px-4 sm:px-6 py-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-base font-medium text-gray-900 dark:text-white">
                  {t('Delete Account')}
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                  {t('Delete account description')}
                </p>
              </div>
              <button
                onClick={handleDeleteAccount}
                className="w-full sm:w-auto sm:flex-shrink-0 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors"
              >
                {t('Delete Account')}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            ← {t('Back to Dashboard')}
          </button>
        </div>
      </div>
    </div>
  );
}
