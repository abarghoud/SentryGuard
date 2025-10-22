'use client';

import { useVehicles } from '../../../lib/useVehicles';
import VehicleCard from '../../../components/VehicleCard';

export default function VehiclesPage() {
  const { vehicles, isLoading, error, fetchVehicles, configureTelemetryForVehicle } = useVehicles();

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
            Your Vehicles
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Manage telemetry configuration for your Tesla vehicles
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={fetchVehicles}
            className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div className="ml-3">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        </div>
      )}

      {vehicles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No vehicles</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            No vehicles found in your Tesla account. They will appear here automatically once detected.
          </p>
          <div className="mt-6">
            <button
              onClick={fetchVehicles}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-tesla-600 hover:bg-tesla-700"
            >
              Refresh Vehicles
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
            <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
              About Telemetry
            </h3>
            <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
              <p>
                Enabling telemetry allows TeslaGuard to monitor your vehicle's Sentry Mode status in real-time. 
                When suspicious activity is detected, you'll receive instant alerts via Telegram.
              </p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Real-time Sentry Mode monitoring</li>
                <li>Instant Telegram notifications</li>
                <li>Battery and location tracking</li>
                <li>Secure end-to-end encryption</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

