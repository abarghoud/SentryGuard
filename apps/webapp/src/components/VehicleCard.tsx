'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Vehicle } from '../lib/api';
import Spinner from './Spinner';

interface VehicleCardProps {
  vehicle: Vehicle;
  onToggleTelemetry: (
    vin: string
  ) => Promise<{
    success: boolean;
    message?: string;
    skippedVehicle?: { vin: string; reason: string; details?: string } | null;
  }>;
  onDeleteTelemetry: (vin: string) => Promise<boolean>;
}

export default function VehicleCard({
  vehicle,
  onToggleTelemetry,
  onDeleteTelemetry,
}: VehicleCardProps) {
  const { t } = useTranslation('common');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const formatSkippedReason = (reason: string, details?: string) => {
    switch (reason) {
      case 'missing_key':
        return t('Virtual key not added to the vehicle');
      case 'unsupported_hardware':
        return t('Unsupported hardware (pre-2018 Model S/X)');
      case 'unsupported_firmware':
        return t('Unsupported firmware version for telemetry');
      case 'max_configs':
        return t('Maximum telemetry configurations already present');
      default:
        return details
          ? t('Vehicle skipped for an unknown reason: {{details}}', { details })
          : t('Vehicle skipped for an unknown reason');
    }
  };

  const handleToggle = async () => {
    if (vehicle.telemetry_enabled) return; // Already configured

    setIsConfiguring(true);
    setInlineError(null);
    const result = await onToggleTelemetry(vehicle.vin);
    if (!result.success) {
      const skipped = result.skippedVehicle;
      if (skipped) {
        setInlineError(formatSkippedReason(skipped.reason, skipped.details));
      } else if (result.message) {
        setInlineError(result.message);
      } else {
        setInlineError(t('Failed to configure telemetry'));
      }
    }
    setIsConfiguring(false);
  };

  const handleDisable = async () => {
    if (!window.confirm(t('Are you sure you want to disable telemetry for this vehicle?'))) {
      return;
    }

    setIsDeleting(true);
    try {
      await onDeleteTelemetry(vehicle.vin);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {vehicle.display_name || vehicle.vin}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('VIN')}: {vehicle.vin}
          </p>
          {vehicle.model && (
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
              {t('Model')}: {vehicle.model}
            </p>
          )}
        </div>
        <div className="flex-shrink-0">
          <img src="/tesla-logo-red.svg" alt="Tesla Logo" className="w-12 h-12" />
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('Telemetry Status')}:
          </span>
          {vehicle.telemetry_enabled ? (
            <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              {t('Enabled')}
            </span>
          ) : (
            <span className="ml-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              <svg
                className="w-3 h-3 mr-1"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              {t('Disabled')}
            </span>
          )}
        </div>

        {!vehicle.telemetry_enabled && (
          <button
            onClick={handleToggle}
            disabled={isConfiguring}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-tesla-600 hover:bg-tesla-700 text-white text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title={t('Enable Telemetry')}
          >
            {isConfiguring ? (
              <Spinner />
            ) : (
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            )}
            <span>{isConfiguring ? t('Configuring...') : t('Enable')}</span>
          </button>
        )}

        {vehicle.telemetry_enabled && (
          <button
            onClick={handleDisable}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700"
            title={t('Disable Telemetry')}
          >
            {isDeleting ? (
              <Spinner />
            ) : (
              <svg
                className="w-3.5 h-3.5"
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
            )}
            <span>{isDeleting ? t('Disabling...') : t('Disable')}</span>
          </button>
        )}
      </div>

      {inlineError && (
        <div className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-100">
          {inlineError}
        </div>
      )}
    </div>
  );
}
