'use client';

import { useEffect, useState, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter } from 'next/navigation';
import { setToken, getConsentStatus } from '../../lib/api';
import LanguageSwitcher from '../../components/LanguageSwitcher';

function CallbackContent() {
  const { t } = useTranslation('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'cancelled'>(
    'loading'
  );
  const [message, setMessage] = useState(t('Processing authentication...'));

  useEffect(() => {
    const handleCallback = async () => {
      const hash = typeof window !== 'undefined' ? window.location.hash : '';
      const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
      const tokenFromHash = hashParams.get('token');
      const tokenFromQuery = searchParams.get('token');
      const error = searchParams.get('error');

      if (error) {
        if (error === 'login_cancelled') {
          setStatus('cancelled');
          setMessage(t('You cancelled the Tesla login. You can try again whenever you\'re ready.'));
          return;
        }

        if (error.includes('Missing required permissions')) {
          const missingScopes =
            error
              .match(/Missing required permissions: (.+)/)?.[1]
              ?.split(', ') || [];
          const params = new URLSearchParams({
            missing: missingScopes.join(','),
          });
          router.push(`/scopes-fix?${params.toString()}`);
          return;
        }

        setStatus('error');
        setMessage(t('Authentication failed {{error}}', { error }));
        return;
      }

      const token = tokenFromHash || tokenFromQuery;

      if (token) {
        setToken(token);
        setStatus('success');
        setMessage(t('Authentication successful! Checking consent status...'));

        try {
          const consentStatus = await getConsentStatus();
          if (!consentStatus.hasConsent) {
            setMessage(t('Authentication successful! Redirecting to consent form...'));
            setTimeout(() => {
              router.push('/consent');
            }, 1500);
          } else {
            setMessage(t('Authentication successful! Redirecting to dashboard...'));
            setTimeout(() => {
              router.push('/dashboard');
            }, 1500);
          }
        } catch (error) {
          console.warn('Failed to check consent status, redirecting to consent:', error);
          setMessage(t('Authentication successful! Redirecting to consent form...'));
          setTimeout(() => {
            router.push('/consent');
          }, 1500);
        }
      } else {
        setStatus('error');
        setMessage(
          'No authentication token received. Please try logging in again.'
        );
      }
    };

    handleCallback();
  }, [searchParams, router]);

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md w-full bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
        <div className="text-center">
          {status === 'loading' && (
            <div className="mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
            </div>
          )}

          {status === 'success' && (
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-green-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}

          {status === 'error' && (
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-red-500 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          )}

          {status === 'cancelled' && (
            <div className="mb-4">
              <svg
                className="w-16 h-16 text-gray-400 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                />
              </svg>
            </div>
          )}

          <h1 className="text-2xl font-bold mb-2 text-gray-900">
            {status === 'loading' && t('Authenticating...')}
            {status === 'success' && t('Success!')}
            {status === 'error' && t('Authentication Failed')}
            {status === 'cancelled' && t('Login Cancelled')}
          </h1>

          <p className="text-gray-600">{message}</p>

          {status === 'error' && (
            <a
              href="/"
              className="mt-6 inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {t('Return to Home')}
            </a>
          )}

          {status === 'cancelled' && (
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
              >
                {t('Try Again')}
              </a>
              <a
                href="/"
                className="inline-block bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-lg border border-gray-300 transition-colors duration-200"
              >
                {t('Back to home')}
              </a>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-gray-50 flex items-center justify-center px-6">
          <div className="max-w-md w-full bg-white rounded-xl p-8 border border-gray-200 shadow-lg">
            <div className="text-center">
              <div className="mb-4">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-red-600"></div>
              </div>
              <h1 className="text-2xl font-bold mb-2 text-gray-900">Authenticating...</h1>
              <p className="text-gray-600">Please wait</p>
            </div>
          </div>
        </main>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}
