'use client';

import { Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import LanguageSwitcher from '../../components/LanguageSwitcher';

function WaitlistContent() {
  const { t } = useTranslation('common');
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-yellow-500 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t("You're on the Waitlist!")}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('Thank you for your interest in SentryGuard')}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <div className="text-center">
            {email ? (
              <p className="text-gray-700 dark:text-gray-300 mb-4">
                {t('We have received your registration for')}{' '}
                <strong>{email}</strong>
              </p>
            ) : null}
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {t(
                "Your account is pending approval. We'll send you an email once your account has been approved and you can start using SentryGuard."
              )}
            </p>
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                {t('Approval is typically processed within 24-48 hours.')}
              </p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
            >
              {t('Back to home')}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function WaitlistPage() {
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
                Loading...
              </h1>
            </div>
          </div>
        </main>
      }
    >
      <WaitlistContent />
    </Suspense>
  );
}
