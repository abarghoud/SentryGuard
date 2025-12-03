'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { acceptConsent, getConsentText, type ConsentTextResponse } from '../../lib/api';

export default function ConsentPage() {
  const { t, i18n } = useTranslation('common');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingText, setIsLoadingText] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);
  const [consentText, setConsentText] = useState<ConsentTextResponse | null>(null);

  useEffect(() => {
    const loadConsentText = async () => {
      try {
        const locale = i18n.language || 'en';
        const text = await getConsentText('v1', locale);
        setConsentText(text);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load consent text');
      } finally {
        setIsLoadingText(false);
      }
    };

    loadConsentText();
  }, [i18n.language]);

  const renderConsentParagraphs = useCallback((text: string) => {
    const paragraphs = text.split('\n\n');
    const totalParagraphs = paragraphs.length;

    return paragraphs.map((paragraph, index) => {
      if (
        paragraph.startsWith('Version:') ||
        paragraph.startsWith('Locale:') ||
        paragraph.startsWith('Partner:') ||
        paragraph.startsWith('App:') ||
        paragraph === ''
      ) {
        return null;
      }

      const parts = paragraph.split(/(https?:\/\/[^\s]+)/g);
      const isLastParagraph = index === totalParagraphs - 2;

      return (
        <p key={index} className={isLastParagraph ? 'font-semibold' : ''}>
          {parts.map((part, i) =>
            part.match(/^https?:\/\//) ? (
              <a
                key={i}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-500 underline"
              >
                {part}
              </a>
            ) : (
              part
            )
          )}
        </p>
      );
    });
  }, []);

  const handleAccept = async () => {
    if (!consentText) {
      setError('Consent text not loaded');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await acceptConsent({
        version: consentText.version,
        locale: consentText.locale,
        appTitle: consentText.appTitle,
        partnerName: consentText.partnerName,
      });

      setAcceptedAt(new Date().toLocaleString());

      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (acceptedAt) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
                {t('Consent accepted successfully!')}
              </h2>
              <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
                {t('Accepted at: {{date}}', { date: acceptedAt })}
              </p>
              <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
                {t('Redirecting to dashboard...')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="absolute top-4 right-4">
        <LanguageSwitcher />
      </div>

      <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
          <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('Tesla Fleet API Consent')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('Please read and accept the terms below to continue')}
              </p>
            </div>

            {/* Consent Text */}
            {isLoadingText ? (
              <div className="mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">{t('Loading consent text...')}</p>
                </div>
              </div>
            ) : consentText ? (
              <div className="prose prose-sm dark:prose-invert max-w-none mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                  {renderConsentParagraphs(consentText.text)}
                </div>
              </div>
            ) : (
              <div className="mb-8 p-6 bg-red-50 dark:bg-red-900 rounded-lg">
                <p className="text-red-700 dark:text-red-200">{t('Failed to load consent text')}</p>
              </div>
            )}

            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={handleAccept}
                disabled={isLoading || isLoadingText || !consentText}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('Processing...') : isLoadingText ? t('Loading...') : t('I Accept')}
              </button>

              {error && (
                <div className="w-full bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
                  <div className="text-sm text-red-700 dark:text-red-200">
                    {error}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                {t('By clicking "I Accept", you agree to the terms above and consent to the processing of your personal data.')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
