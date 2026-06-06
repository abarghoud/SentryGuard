import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import { useOnboardingQuery } from '../../di';
import { useVehiclesQuery } from '../../../vehicles/di';

export function useTelemetryActivation(onCompleted?: () => Promise<void>) {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { completeOnboardingMutation } = useOnboardingQuery();

  const {
    query: vehicleQuery,
    configureTelemetryMutation,
    deleteTelemetryMutation,
    toggleBreakInMutation,
    updateOffensiveResponseMutation,
  } = useVehiclesQuery();

  const vehicles = useMemo(() => vehicleQuery.data ?? [], [vehicleQuery.data]);
  const isLoading = vehicleQuery.isLoading;

  const [activatingVins, setActivatingVins] = useState<Set<string>>(new Set());
  const [deletingVins, setDeletingVins] = useState<Set<string>>(new Set());
  const [togglingBreakInVins, setTogglingBreakInVins] = useState<Set<string>>(new Set());
  const [togglingOffensiveVins, setTogglingOffensiveVins] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, string>>(new Map());
  const [isCompleting, setIsCompleting] = useState(false);

  const completeOnboarding = useCallback(async () => {
    try {
      await completeOnboardingMutation.mutateAsync();

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      return { success: false, error: message };
    }
  }, [completeOnboardingMutation]);

  const isVehicleUpdating = useCallback((vin: string) => {
    return (
      activatingVins.has(vin) ||
      deletingVins.has(vin) ||
      togglingBreakInVins.has(vin) ||
      togglingOffensiveVins.has(vin)
    );
  }, [activatingVins, deletingVins, togglingBreakInVins, togglingOffensiveVins]);

  const handleToggleBreakIn = useCallback(async (vin: string, currentEnabled: boolean) => {
    setTogglingBreakInVins((prev) => new Set(prev).add(vin));
    setErrors((prev) => {
      const newErrors = new Map(prev);
      newErrors.delete(vin);
      return newErrors;
    });

    try {
      await toggleBreakInMutation.mutateAsync({ vin, enable: !currentEnabled });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      setErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.set(vin, message || t('Failed to update Break-in monitoring'));
        return newErrors;
      });
    } finally {
      setTogglingBreakInVins((prev) => {
        const newSet = new Set(prev);
        newSet.delete(vin);
        return newSet;
      });
    }
  }, [toggleBreakInMutation, t]);

  const handleToggleOffensive = useCallback(async (vin: string, currentEnabled: boolean) => {
    setTogglingOffensiveVins((prev) => new Set(prev).add(vin));
    setErrors((prev) => {
      const newErrors = new Map(prev);
      newErrors.delete(vin);
      return newErrors;
    });

    try {
      const nextValue = currentEnabled ? 'DISABLED' : 'HONK';

      await updateOffensiveResponseMutation.mutateAsync({ vin, breakInResponse: nextValue });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);

      setErrors((prev) => {
        const newErrors = new Map(prev);
        newErrors.set(vin, message || t('Failed to update offensive response'));
        return newErrors;
      });
    } finally {
      setTogglingOffensiveVins((prev) => {
        const newSet = new Set(prev);
        newSet.delete(vin);
        return newSet;
      });
    }
  }, [updateOffensiveResponseMutation, t]);

  const hasTelemetryEnabled = useMemo(() => {
    return vehicles.some(
      (v) => v.sentry_mode_monitoring_enabled === true || v.break_in_monitoring_enabled === true
    );
  }, [vehicles]);

  const handleToggleSentry = useCallback(async (vin: string, currentEnabled: boolean) => {
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
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        setErrors((prev) => {
          const newErrors = new Map(prev);
          newErrors.set(vin, message || t('Failed to disable telemetry'));
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
  }, [configureTelemetryMutation, deleteTelemetryMutation, t]);

  const handleCompleteOnboarding = useCallback(async () => {
    setIsCompleting(true);
    try {
      const result = await completeOnboarding();

      if (result.success) {
        if (onCompleted) {
          await onCompleted();
        } else {
          router.push('/dashboard');
        }
      } else {
        console.error('Failed to complete onboarding:', result.error);
      }
    } finally {
      setIsCompleting(false);
    }
  }, [completeOnboarding, onCompleted, router]);

  return {
    vehicles,
    isLoading,
    activatingVins,
    deletingVins,
    togglingBreakInVins,
    togglingOffensiveVins,
    errors,
    isCompleting,
    hasTelemetryEnabled,
    handleToggleBreakIn,
    handleToggleOffensive,
    handleToggleSentry,
    handleCompleteOnboarding,
    isVehicleUpdating,
  };
}
