'use client';

import { useTranslation } from 'react-i18next';
import { useVehicles } from '../../../lib/useVehicles';
import VehicleCard from '../../../components/VehicleCard';

export default function VehiclesPage() {
  const { t } = useTranslation('common');
  const {
    vehicles,
    isLoading,
    error,
    fetchVehicles,
    configureTelemetryForVehicle,
  } = useVehicles();

  // Vérifier le statut key_paired depuis le premier véhicule (si disponible)
  const isKeyPaired = vehicles.length > 0 ? vehicles[0].key_paired : null;

  const handlePairVirtualKey = () => {
    window.location.href = 'https://www.tesla.com/_ak/ws.sentryguard.org';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-tesla-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="sm:flex sm:items-center sm:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {t('Your Vehicles')}
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            {t('Manage telemetry configuration for your Tesla vehicles')}
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={fetchVehicles}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            {t('Refresh')}
          </button>
        </div>
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

      {/* Virtual Key Pairing Status */}
      {isKeyPaired !== null && vehicles.length > 0 && (
        <div
          className={`mb-6 rounded-lg border p-4 ${
            isKeyPaired
              ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isKeyPaired ? (
                <>
                  <svg
                    className="h-5 w-5 text-green-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800 dark:text-green-200">
                      {t('Virtual Key Paired')}
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                      {t(
                        'Your Tesla account is successfully paired with a virtual key.'
                      )}
                    </p>
                  </div>
                </>
              ) : (
                <>
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
                    <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      {t('Virtual Key Not Paired')}
                    </p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                      {t(
                        'You need to pair your Tesla account with a virtual key to use TeslaGuard.'
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
            {!isKeyPaired && (
              <button
                onClick={handlePairVirtualKey}
                className="ml-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tesla-600 hover:bg-tesla-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tesla-500"
              >
                <svg
                  className="h-4 w-4 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                  />
                </svg>
                {t('Pair Virtual Key')}
              </button>
            )}
          </div>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
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
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            {t('No vehicles')}
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t(
              'No vehicles found in your Tesla account. They will appear here automatically once detected.'
            )}
          </p>
          <div className="mt-6">
            <button
              onClick={fetchVehicles}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tesla-600 hover:bg-tesla-700"
            >
              {t('Refresh Vehicles')}
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {vehicles.map((vehicle) => (
            <VehicleCard
              key={vehicle.id}
              vehicle={vehicle}
              onToggleTelemetry={configureTelemetryForVehicle}
            />
          ))}
        </div>
      )}

      {/* Info Section */}
      <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-blue-400"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {t('About Telemetry')}
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p>
                {t(
                  "Enabling telemetry allows TeslaGuard to monitor your vehicle's Sentry Mode status in real-time. When suspicious activity is detected, you'll receive instant alerts via Telegram."
                )}
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>{t('Real-time Sentry Mode monitoring')}</li>
                <li>{t('Instant Telegram notifications')}</li>
                <li>{t('Battery and location tracking')}</li>
                <li>{t('Secure end-to-end encryption')}</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
