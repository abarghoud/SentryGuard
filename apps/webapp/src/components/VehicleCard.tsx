'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Vehicle } from '../lib/api';

interface VehicleCardProps {
  vehicle: Vehicle;
  onToggleTelemetry: (vin: string) => Promise<boolean>;
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

  const handleToggle = async () => {
    if (vehicle.telemetry_enabled) return; // Already configured

    setIsConfiguring(true);
    await onToggleTelemetry(vehicle.vin);
    setIsConfiguring(false);
  };

  const handleDelete = async () => {
    // Confirmation before deletion
    if (!window.confirm(t('Are you sure you want to delete the telemetry configuration for this vehicle?'))) {
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
          <svg
            className="w-12 h-12 text-gray-400"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 5.362l2.475-3.026h-4.95L12 5.362zm-2.475 4.07L7.05 6.406 2.475 11.93h7.05v-2.5zm4.95 0v2.5h7.05l-4.575-5.525-2.475 3.025zM12 14.407l2.475 3.025 2.475-3.025H12zm-6.525-2.407L2 19.594h9V12H5.475zm13.05 0H14v7.594h9L19.525 12z" />
          </svg>
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
            className="px-4 py-2 bg-tesla-600 hover:bg-tesla-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isConfiguring ? t('Configuring...') : t('Enable Telemetry')}
          </button>
        )}

        {vehicle.telemetry_enabled && (
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-red-700 dark:hover:bg-red-800"
          >
            {isDeleting ? t('Deleting...') : t('Delete Configuration')}
          </button>
        )}
      </div>
    </div>
  );
}
