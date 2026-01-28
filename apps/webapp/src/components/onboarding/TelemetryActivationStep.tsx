'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../../lib/useOnboarding';
import { useVehicles } from '../../lib/useVehicles';
import OnboardingStepLayout from './OnboardingStepLayout';

interface TelemetryActivationStepProps {
  onCompleted?: () => Promise<void>;
}

export default function TelemetryActivationStep({ onCompleted }: TelemetryActivationStepProps) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { completeOnboarding } = useOnboarding();
  const { vehicles, configureTelemetryForVehicle, isLoading } = useVehicles();
  const [activatingVins, setActivatingVins] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [isCompleting, setIsCompleting] = useState(false);

  const hasTelemetryEnabled = vehicles.some((v) => v.telemetry_enabled === true);

  const handleActivateTelemetry = async (vin: string) => {
    setActivatingVins((prev) => new Set(prev).add(vin));
    setErrors((prev) => {
      const newErrors = new Map(prev);
      newErrors.delete(vin);
      return newErrors;
    });

    try {
      const result = await configureTelemetryForVehicle(vin);

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
      title={t('Enable Telemetry')}
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
                {t('✅ Telemetry enabled! Your setup is complete.')}
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
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {vehicle.display_name || `${vehicle.model} (${vehicle.vin.slice(-4)})`}
                    </h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      VIN: {vehicle.vin}
                    </p>
                  </div>
                  {vehicle.telemetry_enabled && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                      {t('Enabled')}
                    </span>
                  )}
                </div>

                {/* Error message for this vehicle */}
                {errors.has(vehicle.vin) && (
                  <div className="mb-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded p-2">
                    <p className="text-xs text-red-800 dark:text-red-200">
                      {errors.get(vehicle.vin)}
                    </p>
                  </div>
                )}

                {/* Activate button */}
                {!vehicle.telemetry_enabled && (
                  <button
                    onClick={() => handleActivateTelemetry(vehicle.vin)}
                    disabled={activatingVins.has(vehicle.vin)}
                    className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-medium py-2 px-4 rounded transition-colors duration-200 disabled:cursor-not-allowed text-sm"
                  >
                    {activatingVins.has(vehicle.vin)
                      ? t('Activating...')
                      : t('Activate Telemetry')}
                  </button>
                )}
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
