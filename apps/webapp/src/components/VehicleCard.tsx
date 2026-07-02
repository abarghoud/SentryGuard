'use client';

import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { type Vehicle } from '../features/vehicles/domain/entities';
import Spinner from './Spinner';
import RequireVehicleCommands from './RequireVehicleCommands';
import VinMask from './VinMask';

function BreakInOffensiveSelect({
  value,
  isDisabled,
  onChange,
  tooltipText,
}: {
  value: string;
  isDisabled: boolean;
  onChange: (value: string) => void;
  tooltipText: string;
}) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
      if (showTooltip && tooltipRef.current && !tooltipRef.current.contains(e.target as Node)) {
        setShowTooltip(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTooltip]);

  const options = [
    { value: 'DISABLED', label: `🔇 ${t('Disabled')}`, description: t('offensiveResponseDisabled') },
    { value: 'HONK', label: `📢 ${t('Horn')}`, description: t('offensiveResponseHonk') },
    { value: 'FART', label: `💨 ${t('Fart')}`, description: t('offensiveResponseFart') },
  ];

  const currentOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('Offensive Response')}
          </span>
          <button
            onClick={() => setShowTooltip(!showTooltip)}
            className="inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            type="button"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <div className="relative inline-block text-left" ref={dropdownRef}>
          <button
            onClick={() => !isDisabled && setIsOpen(!isOpen)}
            disabled={isDisabled}
            type="button"
            className="flex items-center justify-between gap-2 w-40 rounded-lg px-3 py-1.5 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 text-sm text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-600 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-left font-medium"
          >
            <span>{currentOption.label}</span>
            <svg
              className={`w-4 h-4 text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute right-0 mt-2 w-44 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-xl z-[100] overflow-hidden origin-top-right ring-1 ring-black ring-opacity-5">
              <div className="py-1">
                {options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-all duration-200 ${
                      value === opt.value
                        ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 font-bold'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {value === opt.value && (
                      <svg className="w-4 h-4 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
        {currentOption.description}
      </p>
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="mt-2 rounded-md bg-gray-800 dark:bg-gray-700 px-3 py-2 text-xs text-white shadow-lg"
        >
          {tooltipText}
        </div>
      )}
    </div>
  );
}

export default function VehicleCard({
  vehicle,
  onToggleTelemetry,
  onToggleBreakInMonitoring,
  onUpdateBreakInOffensive,
  onDeleteTelemetry,
}: VehicleCardProps) {
  const { t } = useTranslation('common');
  const [isConfiguring, setIsConfiguring] = useState(false);
  const [isConfiguringBreakIn, setIsConfiguringBreakIn] = useState(false);
  const [isUpdatingBreakInOffensive, setIsUpdatingBreakInOffensive] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [inlineError, setInlineError] = useState<string | null>(null);

  const isUpdating = isConfiguring || isConfiguringBreakIn || isUpdatingBreakInOffensive || isDeleting;

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
    if (vehicle.sentry_mode_monitoring_enabled) return;

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

  const handleToggleBreakIn = async () => {
    setIsConfiguringBreakIn(true);
    setInlineError(null);
    const newStatus = !vehicle.break_in_monitoring_enabled;
    const result = await onToggleBreakInMonitoring(vehicle.vin, newStatus);
    if (!result) {
      setInlineError(t('Failed to update Break-in monitoring'));
    }
    setIsConfiguringBreakIn(false);
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

  const handleUpdateBreakInOffensive = async (newResponse: string) => {
    setIsUpdatingBreakInOffensive(true);
    setInlineError(null);
    const result = await onUpdateBreakInOffensive(vehicle.vin, newResponse);
    if (!result) {
      setInlineError(t('Failed to update offensive response'));
    }
    setIsUpdatingBreakInOffensive(false);
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
            {vehicle.display_name || <VinMask vin={vehicle.vin} />}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('VIN')}: <VinMask vin={vehicle.vin} />
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

      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('Sentry Mode Monitoring')}
          </span>
          {vehicle.sentry_mode_monitoring_enabled ? (
            <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {t('Enabled')}
            </span>
          ) : (
            <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
              <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {t('Disabled')}
            </span>
          )}
        </div>

        {!vehicle.sentry_mode_monitoring_enabled && (
          <button
            onClick={handleToggle}
            disabled={isUpdating}
            className="w-full justify-center shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 bg-tesla-600 hover:bg-tesla-700 text-white text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            title={t('Enable Telemetry')}
          >
            {isConfiguring ? (
              <Spinner />
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            )}
            <span>{isConfiguring ? t('Configuring...') : t('Enable')}</span>
          </button>
        )}

        {vehicle.sentry_mode_monitoring_enabled && (
          <>
            <button
              onClick={handleDisable}
              disabled={isUpdating}
              className="w-full justify-center shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-700 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400 dark:hover:text-gray-300 border border-gray-200 dark:border-gray-700"
              title={t('Disable Telemetry')}
            >
              {isDeleting ? (
                <Spinner />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              )}
              <span>{isDeleting ? t('Disabling...') : t('Disable')}</span>
            </button>
          </>
        )}
      </div>

      <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-1">
               <span>{t('Break-in Monitoring')}</span>
            </span>
            {vehicle.break_in_monitoring_enabled ? (
              <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {t('Enabled')}
              </span>
            ) : (
             <span className="shrink-0 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {t('Disabled')}
              </span>
            )}
          </div>
          <button
              onClick={handleToggleBreakIn}
              disabled={isUpdating}
              className={`w-full justify-center shrink-0 inline-flex items-center gap-1.5 px-2.5 py-2 text-xs font-medium rounded-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${!vehicle.break_in_monitoring_enabled ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-600 border border-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-400'}`}
              title={vehicle.break_in_monitoring_enabled ? t('Disable Break-in') : t('Enable Break-in')}
            >
              {isConfiguringBreakIn ? (
                <Spinner />
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {vehicle.break_in_monitoring_enabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  )}
                </svg>
              )}
              <span>{isConfiguringBreakIn ? t('Configuring...') : (vehicle.break_in_monitoring_enabled ? t('Disable') : t('Enable'))}</span>
            </button>

          {vehicle.break_in_monitoring_enabled && (
            <RequireVehicleCommands
              title={t('offensiveResponseLockedTitle')}
              description={t('offensiveResponseLockedDescription')}
              buttonLabel={t('offensiveResponseLockedButton')}
            >
              <BreakInOffensiveSelect
                value={vehicle.break_in_offensive_response || 'DISABLED'}
                isDisabled={isUpdatingBreakInOffensive}
                onChange={handleUpdateBreakInOffensive}
                tooltipText={t('offensiveResponseInfo')}
              />
            </RequireVehicleCommands>
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

interface VehicleCardProps {
  vehicle: Vehicle;
  onToggleTelemetry: (
    vin: string
  ) => Promise<{
    success: boolean;
    message?: string;
    skippedVehicle?: { vin: string; reason: string; details?: string } | null;
  }>;
  onToggleBreakInMonitoring: (vin: string, enable: boolean) => Promise<boolean>;
  onUpdateBreakInOffensive: (vin: string, breakInResponse: string) => Promise<boolean>;
  onDeleteTelemetry: (vin: string) => Promise<boolean>;
}