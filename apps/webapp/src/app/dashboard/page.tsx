'use client';

import { useAuth } from '../../lib/useAuth';
import { useVehicles } from '../../lib/useVehicles';
import { useTelegram } from '../../lib/useTelegram';
import Link from 'next/link';

export default function DashboardPage() {
  const { profile } = useAuth();
  const { vehicles } = useVehicles();
  const { status: telegramStatus } = useTelegram();

  const enabledVehicles = vehicles.filter((v) => v.telemetry_enabled).length;
  const totalVehicles = vehicles.length;

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back{profile?.full_name ? `, ${profile.full_name}` : ''}!
        </h1>
        <p className="mt-2 text-gray-600 dark:text-gray-400">
          Monitor and protect your Tesla vehicles
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {/* Vehicles Card */}
        <Link href="/dashboard/vehicles">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 5.362l2.475-3.026h-4.95L12 5.362zm-2.475 4.07L7.05 6.406 2.475 11.93h7.05v-2.5zm4.95 0v2.5h7.05l-4.575-5.525-2.475 3.025zM12 14.407l2.475 3.025 2.475-3.025H12zm-6.525-2.407L2 19.594h9V12H5.475zm13.05 0H14v7.594h9L19.525 12z"/>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Vehicles
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {totalVehicles}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-tesla-600 dark:text-tesla-400 hover:text-tesla-700">
                  View all →
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Telemetry Status Card */}
        <Link href="/dashboard/vehicles">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Telemetry Enabled
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {enabledVehicles}/{totalVehicles}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-tesla-600 dark:text-tesla-400 hover:text-tesla-700">
                  Configure →
                </span>
              </div>
            </div>
          </div>
        </Link>

        {/* Telegram Status Card */}
        <Link href="/dashboard/telegram">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow cursor-pointer border border-gray-200 dark:border-gray-700">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.51 0 10-4.48 10-10S17.51 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Telegram Alerts
                    </dt>
                    <dd className="flex items-baseline">
                      <div className="text-2xl font-semibold text-gray-900 dark:text-white">
                        {telegramStatus?.linked ? (
                          <span className="text-green-600 dark:text-green-400">✓</span>
                        ) : (
                          <span className="text-red-600 dark:text-red-400">✗</span>
                        )}
                      </div>
                      <div className="ml-2 text-sm text-gray-600 dark:text-gray-400">
                        {telegramStatus?.linked ? 'Linked' : 'Not linked'}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700/50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-tesla-600 dark:text-tesla-400 hover:text-tesla-700">
                  {telegramStatus?.linked ? 'Manage' : 'Setup'} →
                </span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Quick Actions
          </h3>
          <div className="mt-4 flex flex-col sm:flex-row gap-4">
            <Link
              href="/dashboard/vehicles"
              className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-tesla-600 hover:bg-tesla-700"
            >
              Manage Vehicles
            </Link>
            <Link
              href="/dashboard/telegram"
              className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Configure Alerts
            </Link>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      {totalVehicles === 0 && (
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                No vehicles found
              </h3>
              <div className="mt-2 text-sm text-blue-700 dark:text-blue-300">
                <p>
                  Your vehicles will appear here once they are synced from your Tesla account. 
                  Visit the <Link href="/dashboard/vehicles" className="font-semibold underline">Vehicles page</Link> to refresh.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

