'use client';

import { useTranslation } from 'react-i18next';

interface MissingScopesBannerProps {
  missingScopes: string[];
  onFixClick: () => void;
  isLoading?: boolean;
}

export default function MissingScopesBanner({
  missingScopes,
  onFixClick,
  isLoading = false,
}: MissingScopesBannerProps) {
  const { t } = useTranslation('common');
  const getScopeDescription = (scope: string): string => {
    switch (scope) {
      case 'vehicle_device_data':
        return t('Vehicle telemetry data');
      case 'offline_access':
        return t('Offline access');
      case 'user_data':
        return t('User profile data');
      case 'openid':
        return t('OpenID authentication');
      default:
        return scope;
    }
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg
              className="h-5 w-5 text-yellow-400"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              {t('Additional Permissions Required')}
            </h3>
            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
              <p>
                {t(
                  'Your Tesla account needs additional permissions to use TeslaGuard'
                )}
              </p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                {missingScopes.map((scope) => (
                  <li key={scope}>{getScopeDescription(scope)}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <div className="ml-4">
          <button
            onClick={onFixClick}
            disabled={isLoading}
            className="bg-yellow-100 dark:bg-yellow-800 hover:bg-yellow-200 dark:hover:bg-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isLoading ? t('Re-authenticating...') : t('Fix Permissions')}
          </button>
        </div>
      </div>
    </div>
  );
}
