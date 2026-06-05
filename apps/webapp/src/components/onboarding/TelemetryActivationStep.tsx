'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useOnboardingQuery } from '../../features/onboarding/di';
import { useVehiclesQuery } from '../../features/vehicles/di';
import OnboardingStepLayout from './OnboardingStepLayout';
import RequireVehicleCommands from '../RequireVehicleCommands';

interface TelemetryActivationStepProps {
  onCompleted?: () => Promise<void>;
}

export default function TelemetryActivationStep({ onCompleted }: TelemetryActivationStepProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { completeOnboardingMutation } = useOnboardingQuery();
  const completeOnboarding = async () => {
    try {
      await completeOnboardingMutation.mutateAsync();
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };
  const {
    query: vehicleQuery,
    configureTelemetryMutation,
    deleteTelemetryMutation,
    toggleBreakInMutation,
    updateOffensiveResponseMutation,
  } = useVehiclesQuery();
  const { data: vehicles = [], isLoading } = vehicleQuery;
  const [activatingVins, setActivatingVins] = useState<Set<string>>(new Set());
  const [deletingVins, setDeletingVins] = useState<Set<string>>(new Set());
  const [togglingBreakInVins, setTogglingBreakInVins] = useState<Set<string>>(new Set());
  const [togglingOffensiveVins, setTogglingOffensiveVins] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [isCompleting, setIsCompleting] = useState(false);

  const handleToggleBreakIn = async (vin: string, currentEnabled: boolean) => {
    setTogglingBreakInVins((prev) => new Set(prev).add(vin));
    setErrors((prev) => {
      const newErrors = new Map(prev);
      newErrors.delete(vin);
      return newErrors;
    });
    try {
      await toggleBreakInMutation.mutateAsync({ vin, enable: !currentEnabled });
    } catch (e: any) {
      setErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.set(vin, e.message || t('Failed to update Break-in monitoring'));
        return newErrors;
      });
    } finally {
      setTogglingBreakInVins((prev) => {
        const newSet = new Set(prev);
        newSet.delete(vin);
        return newSet;
      });
    }
  };

  const handleToggleOffensive = async (vin: string, currentEnabled: boolean) => {
    setTogglingOffensiveVins((prev) => new Set(prev).add(vin));
    setErrors((prev) => {
      const newErrors = new Map(prev);
      newErrors.delete(vin);
      return newErrors;
    });
    try {
      const nextValue = currentEnabled ? 'DISABLED' : 'HONK';
      await updateOffensiveResponseMutation.mutateAsync({ vin, breakInResponse: nextValue });
    } catch (e: any) {
      setErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.set(vin, e.message || t('Failed to update offensive response'));
        return newErrors;
      });
    } finally {
      setTogglingOffensiveVins((prev) => {
        const newSet = new Set(prev);
        newSet.delete(vin);
        return newSet;
      });
    }
  };

  const hasTelemetryEnabled = vehicles.some((v) => v.sentry_mode_monitoring_enabled === true || v.break_in_monitoring_enabled === true);

  const handleToggleTelemetry = async (vin: string, currentEnabled: boolean) => {
    if (currentEnabled) {
      if (!window.confirm(t('Are you sure you want to disable telemetry for this vehicle?'))) {
        return;
      }
      setDeletingVins((prev) => new Set(prev).add(vin));
      setErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.delete(vin);
        return newErrors;
      });
      try {
        await deleteTelemetryMutation.mutateAsync(vin);
      } catch (e: any) {
        setErrors((prev) => {
          const newErrors = new Map(prev);
          newErrors.set(vin, e.message || t('Failed to disable telemetry'));
          return newErrors;
        });
      } finally {
        setDeletingVins((prev) => {
          const newSet = new Set(prev);
          newSet.delete(vin);
          return newSet;
        });
      }
    } else {
      setActivatingVins((prev) => new Set(prev).add(vin));
      setErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.delete(vin);
        return newErrors;
      });
      try {
        const result = await configureTelemetryMutation.mutateAsync(vin);
        if (!result.success) {
          setErrors((prev) => {
            const newErrors = new Map(prev);
            newErrors.set(vin, result.message || t('Failed to enable telemetry'));
            return newErrors;
          });
        }
      } finally {
        setActivatingVins((prev) => {
          const newSet = new Set(prev);
          newSet.delete(vin);
          return newSet;
        });
      }
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsCompleting(true);
    try {
      const result = await completeOnboarding();

      if (result.success) {
        // Notify parent component that onboarding is complete
        if (onCompleted) {
          await onCompleted();
        } else {
          // Fallback: redirect directly if no callback provided
          router.push('/dashboard');
        }
      } else {
        // Show error - the user will see the error message from the backend
        console.error('Failed to complete onboarding:', result.error);
      }
    } finally {
      setIsCompleting(false);
    }
  };

  return (
    <OnboardingStepLayout
      title={t('Enable Sentry Mode Monitoring')}
      description={t(
        'Start monitoring your vehicle\'s Sentry Mode in real-time'
      )}
      stepNumber={4}
      totalSteps={4}
    >
      <div className="space-y-6">
        {/* Success message if telemetry enabled */}
        {hasTelemetryEnabled && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-5 h-5 text-green-600 dark:text-green-400"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                {t('✅ Security monitoring enabled! Your setup is complete.')}
              </p>
            </div>
            <p className="text-xs text-green-700 dark:text-green-300">
              {t(
                'You will now receive instant Telegram alerts when suspicious activity is detected.'
              )}
            </p>
          </div>
        )}

        {/* Vehicles list */}
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              {t('No vehicles found. Please refresh or check your Tesla account.')}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.vin}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 p-5 border border-gray-200 dark:border-gray-700 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-base">
                      {vehicle.display_name || `${vehicle.model} (${vehicle.vin.slice(-4)})`}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      VIN: {vehicle.vin}
                    </p>
                  </div>
                  {vehicle.sentry_mode_monitoring_enabled && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {t('Enabled')}
                    </span>
                  )}
                </div>

                {errors.has(vehicle.vin) && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-3">
                    <p className="text-xs text-red-800 dark:text-red-300">
                      {errors.get(vehicle.vin)}
                    </p>
                  </div>
                )}

                <div className="space-y-4 pt-2">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                        {t('Sentry Mode Monitoring')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 leading-normal block mt-0.5">
                        {t('Monitor Sentry Mode via telemetry without battery drain')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleTelemetry(vehicle.vin, !!vehicle.sentry_mode_monitoring_enabled)}
                      disabled={activatingVins.has(vehicle.vin) || deletingVins.has(vehicle.vin)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        vehicle.sentry_mode_monitoring_enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={vehicle.sentry_mode_monitoring_enabled}
                      type="button"
                    >
                      {activatingVins.has(vehicle.vin) || deletingVins.has(vehicle.vin) ? (
                        <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <svg className="animate-spin h-3 w-3 text-white" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        </span>
                      ) : (
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            vehicle.sentry_mode_monitoring_enabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      )}
                    </button>
                  </div>

                  <div className="flex items-start justify-between gap-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                        {t('Break-in Monitoring')}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 leading-normal block mt-0.5">
                        {t('Receive alerts on Telegram when an intrusion is detected')}
                      </span>
                    </div>
                    <button
                      onClick={() => handleToggleBreakIn(vehicle.vin, !!vehicle.break_in_monitoring_enabled)}
                      disabled={togglingBreakInVins.has(vehicle.vin)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                        vehicle.break_in_monitoring_enabled ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                      }`}
                      role="switch"
                      aria-checked={vehicle.break_in_monitoring_enabled}
                      type="button"
                    >
                      <span
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                          vehicle.break_in_monitoring_enabled ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {vehicle.break_in_monitoring_enabled && (
                    <RequireVehicleCommands
                      title={t('offensiveResponseLockedTitle')}
                      description={t('offensiveResponseLockedDescription')}
                      buttonLabel={t('offensiveResponseLockedButton')}
                    >
                      <div className="flex items-start justify-between gap-4 pt-3 border-t border-gray-100 dark:border-gray-700/50">
                        <div className="flex-1">
                          <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                            {t('Offensive Response')}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400 leading-normal block mt-0.5">
                            {t('offensiveResponseInfo')}
                          </span>
                        </div>
                        <div className="flex-shrink-0">
                          <button
                            onClick={() => handleToggleOffensive(vehicle.vin, vehicle.break_in_offensive_response === 'HONK')}
                            disabled={togglingOffensiveVins.has(vehicle.vin)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                              vehicle.break_in_offensive_response === 'HONK' ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-600'
                            }`}
                            role="switch"
                            aria-checked={vehicle.break_in_offensive_response === 'HONK'}
                            type="button"
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                vehicle.break_in_offensive_response === 'HONK' ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </RequireVehicleCommands>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
            {t(
              '📡 Telemetry monitoring is battery-efficient and uses Tesla\'s official API. You can enable it for one or more vehicles. You\'ll receive alerts via Telegram for each enabled vehicle.'
            )}
          </p>
        </div>

        {/* Complete button (visible when telemetry is enabled) */}
        {hasTelemetryEnabled && (
          <button
            onClick={handleCompleteOnboarding}
            disabled={isCompleting}
            className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
          >
            {isCompleting ? t('Completing...') : t('Complete Onboarding')}
          </button>
        )}

        {/* Alternative text for when no telemetry enabled */}
        {!hasTelemetryEnabled && vehicles.length > 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            {t('Enable telemetry for at least one vehicle to complete setup')}
          </p>
        )}
      </div>
    </OnboardingStepLayout>
  );
}
