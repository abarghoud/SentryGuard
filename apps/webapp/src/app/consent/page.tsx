'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import { acceptConsent } from '../../lib/api';

export default function ConsentPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [acceptedAt, setAcceptedAt] = useState<string | null>(null);

  const handleAccept = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await acceptConsent({
        version: 'v1',
        locale: 'fr', // TODO: get from i18n
        appTitle: 'TeslaGuard',
        partnerName: 'SentryGuardOrg',
      });

      setAcceptedAt(new Date().toLocaleString());

      // Redirect to dashboard after success
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
            <div className="prose prose-sm dark:prose-invert max-w-none mb-8 p-6 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="space-y-4 text-sm text-gray-700 dark:text-gray-300">
                <p>
                  {t('By signing or accepting this form, you consent to the processing of your Personal Data by SentryGuardOrg ("Partner") in the context of the Partner\'s application titled: TeslaGuard (the "App").')}
                </p>
                <p>
                  {t('Partner is the data controller responsible for the processing of your Personal Data in the context of the App.')}
                </p>
                <p>
                  {t('By signing or accepting this form, you also acknowledge receipt of the Tesla Customer Privacy Notice available at')}{' '}
                  <a
                    href="https://www.tesla.com/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500 underline"
                  >
                    https://www.tesla.com/legal/privacy
                  </a>{' '}
                  {t('("Tesla Privacy Notice") and consent to processing of Personal Data by Tesla in accordance with the Tesla Privacy Notice.')}
                </p>
                <p>
                  {t('The App will allow you to benefit from advanced functionalities and will allow Partner to better manage Partner Products. These functionalities may include Tesla product remote commands (e.g., locking/unlocking doors, opening trunk, enable remote start if correct password is provided, open/close roof, honking horn, flashing lights, climate controls, and charge limit), and remote collection of information about product state (such as energy data, charge state, lock state, drive state, climate state, and current location).')}
                </p>
                <p>
                  {t('You understand and agree that to benefit from the App advanced functionalities and Partner\'s fleet management, Partner must process some of your Personal Data, which may include information about Tesla products such as a device number such as a vehicle identification number, speed information, odometer, battery use management information, battery charging history, electrical system functions, software version information, safety related data (including information regarding a vehicle\'s SRS systems, brakes, security, e-brake), data about any issues that could materially impair operation of a Partner Product; data about any safety critical issues and safety critical events; data about software and firmware updates, vehicle and drive state data (including the road segment data and current location) and other data to assist in identifying and analyzing the performance of the Tesla product.')}
                </p>
                <p>
                  {t('Partner will only use this information as described in this document and in particular to (a) provide you with the above functionalities, (b) issue remote product commands or collect information about certain aspects of a product\'s state, (c) advise you on important safety-related information, (d) collect information about a product\'s performance and provide services related to the product, (e) collect information about the use of the product (for example, in order to enable better management the product), and (f) provide services to product users (such as vehicle passengers) where applicable.')}
                </p>
                <p>
                  {t('Partner maintains administrative, technical, and physical safeguards designed to protect Personal Data against accidental, unlawful or unauthorized destruction, loss, alteration, access, disclosure or use. Partner will only retain your Personal Data for as long as necessary to provide you with the App, unless otherwise authorized by you, or required or authorized by applicable law.')}
                </p>
                <p>
                  {t('Subject to applicable law, you may have the right to request access to and receive information about your Personal Data, update and correct inaccuracies in your Personal Data, and have the information deleted, as appropriate. These rights may be limited in some circumstances by local law requirements. You also have the right to withdraw your consent at any time without cost and to access your consent declaration at any time. To exercise your rights or for more information about the App, contact Partner as follows: abarghoud@gmail.com')}
                </p>
                <p className="font-semibold">
                  {t('I consent to the collection, use, and processing of my Personal Data as described above.')}
                </p>
              </div>
            </div>

            {/* Accept Button */}
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={handleAccept}
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? t('Processing...') : t('I Accept')}
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
