import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BREAK_IN_REACTION_DELAYS_SECONDS,
  BreakInSensitivity,
  readBreakInDetection,
  toBreakInDetectionFields,
} from '@sentryguard/vehicles-domain';

import { useHaptics } from '../../core/design/use-haptics';
import { getVehicleCommandsAuthorizationUseCase } from '../../features/auth/di';
import { BreakInDetection, Vehicle, VehicleActionResponse } from '../../features/vehicles/domain/entities';
import {
  configureTelemetryUseCase,
  deleteTelemetryConfigUseCase,
  getVehiclesUseCase,
  toggleBreakInMonitoringUseCase,
  updateAlertSoundsUseCase,
  updateBreakInDetectionUseCase,
  updateOffensiveResponseUseCase,
} from '../../features/vehicles/di';
import {
  canConfigureCounterMeasures,
  requestVehicleCommandsScope,
  resolveSuccessfulResponse,
  resolveTelemetryConfigurationResponse,
  shouldShowBreakInDetection,
} from './vehicle-detail.helpers';
import { AlertSoundTarget, TranslationFunction, VehicleAction, VehicleMutationAction } from './vehicle-detail.types';

interface AlertSoundSelection {
  soundId: string;
  target: AlertSoundTarget;
}

export function useVehicleDetail(vehicleId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const haptics = useHaptics();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [openSoundSelector, setOpenSoundSelector] = useState<AlertSoundTarget | null>(null);

  const vehiclesQuery = useQuery({
    queryFn: () => getVehiclesUseCase.execute(),
    queryKey: ['vehicles'],
  });
  const vehicleCommandsQuery = useQuery({
    queryFn: () => getVehicleCommandsAuthorizationUseCase.execute(),
    queryKey: ['auth', 'vehicle-commands-authorized'],
    staleTime: 5 * 60 * 1000,
  });

  const vehicle = vehiclesQuery.data?.find((cachedVehicle) => cachedVehicle.vin === vehicleId);

  const actionMutation = useMutation<VehicleActionResponse, Error, VehicleMutationAction, { previous?: Vehicle[] }>({
    mutationFn: (action: VehicleMutationAction) => runVehicleAction(vehicle, action, t),
    onMutate: async (action) => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      const previous = queryClient.getQueryData<Vehicle[]>(['vehicles']);

      if (vehicle) {
        queryClient.setQueryData<Vehicle[]>(['vehicles'], (current) =>
          (current ?? []).map((entry) => (entry.vin === vehicle.vin ? applyOptimisticAction(entry, action) : entry))
        );
      }

      return { previous };
    },
    onError: (error: Error, _action, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['vehicles'], context.previous);
      }
      haptics.error();
      setFeedback(error.message);
    },
    onSuccess: () => {
      haptics.success();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
  const alertSoundMutation = useMutation<VehicleActionResponse, Error, AlertSoundSelection, { previous?: Vehicle[] }>({
    scope: { id: `vehicle-alert-sound-${vehicleId}` },
    mutationFn: (selection: AlertSoundSelection) => runAlertSoundUpdate(vehicle, selection, t),
    onMutate: async (selection) => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      const previous = queryClient.getQueryData<Vehicle[]>(['vehicles']);

      if (vehicle) {
        queryClient.setQueryData<Vehicle[]>(['vehicles'], (current) =>
          (current ?? []).map((entry) => (entry.vin === vehicle.vin ? applyOptimisticSound(entry, selection) : entry))
        );
      }

      return { previous };
    },
    onError: (error: Error, _selection, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['vehicles'], context.previous);
      }
      haptics.error();
      setFeedback(error.message);
    },
    onSuccess: () => {
      haptics.success();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
  const breakInDetectionMutation = useMutation<VehicleActionResponse, Error, BreakInDetection, { previous?: Vehicle[] }>({
    scope: { id: `vehicle-break-in-detection-${vehicleId}` },
    mutationFn: (breakInDetection: BreakInDetection) => runBreakInDetectionUpdate(vehicle, breakInDetection, t),
    onMutate: async (breakInDetection) => {
      setFeedback(null);
      await queryClient.cancelQueries({ queryKey: ['vehicles'] });
      const previous = queryClient.getQueryData<Vehicle[]>(['vehicles']);

      if (vehicle) {
        queryClient.setQueryData<Vehicle[]>(['vehicles'], (current) =>
          (current ?? []).map((entry) =>
            entry.vin === vehicle.vin ? { ...entry, ...toBreakInDetectionFields(breakInDetection) } : entry
          )
        );
      }

      return { previous };
    },
    onError: (error: Error, _breakInDetection, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['vehicles'], context.previous);
      }
      haptics.error();
      setFeedback(error.message);
    },
    onSuccess: () => {
      haptics.success();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
  const scopeMutation = useMutation({
    mutationFn: () => requestVehicleCommandsScope(t),
    onError: (error: Error) => {
      haptics.error();
      setFeedback(error.message);
    },
    onSuccess: async () => {
      haptics.success();
      await queryClient.invalidateQueries({ queryKey: ['auth', 'vehicle-commands-authorized'] });
      setFeedback(null);
    },
  });

  const vehicleCommandsAuthorized = vehicleCommandsQuery.data?.authorized === true;
  const { mutate: updateBreakInDetection } = breakInDetectionMutation;
  const breakInDetection = useMemo(() => readBreakInDetection(vehicle ?? {}), [vehicle]);
  const isCounterMeasureConfigurable = useMemo(
    () => vehicle !== undefined && canConfigureCounterMeasures(vehicle, vehicleCommandsAuthorized),
    [vehicle, vehicleCommandsAuthorized]
  );
  const isBreakInDetectionVisible = useMemo(
    () => vehicle !== undefined && shouldShowBreakInDetection(vehicle, vehicleCommandsAuthorized),
    [vehicle, vehicleCommandsAuthorized]
  );
  const breakInSensitivityOptions = useMemo(
    () => [
      { label: t('vehicle.breakInSinglePull'), value: BreakInSensitivity.SinglePull },
      { label: t('vehicle.breakInRepeatedPulls'), value: BreakInSensitivity.RepeatedPulls },
    ],
    [t]
  );
  const breakInReactionDelayOptions = useMemo(
    () =>
      BREAK_IN_REACTION_DELAYS_SECONDS.map((seconds) => ({
        label: t('vehicle.breakInReactionDelaySeconds', { seconds }),
        value: String(seconds),
      })),
    [t]
  );
  const onBreakInSensitivityChange = useCallback(
    (sensitivity: BreakInSensitivity) => updateBreakInDetection({ ...breakInDetection, sensitivity }),
    [breakInDetection, updateBreakInDetection]
  );
  const onBreakInReactionDelayChange = useCallback(
    (reactionDelaySeconds: string) => updateBreakInDetection({ ...breakInDetection, reactionDelaySeconds: Number(reactionDelaySeconds) }),
    [breakInDetection, updateBreakInDetection]
  );

  return {
    actionMutation,
    alertSoundMutation,
    breakInDetection,
    breakInReactionDelayOptions,
    breakInSensitivityOptions,
    feedback,
    isActionRunning: actionMutation.isPending,
    isBreakInDetectionVisible,
    isCounterMeasureConfigurable,
    onBreakInReactionDelayChange,
    onBreakInSensitivityChange,
    openSoundSelector,
    scopeMutation,
    setFeedback,
    setOpenSoundSelector,
    t,
    vehicle,
    vehicleCommandsAuthorized,
  };
}

async function runBreakInDetectionUpdate(
  vehicle: Vehicle | undefined,
  breakInDetection: BreakInDetection,
  t: TranslationFunction
): Promise<VehicleActionResponse> {
  if (!vehicle) {
    throw new Error(t('vehicle.actionRefused'));
  }

  return resolveSuccessfulResponse(await updateBreakInDetectionUseCase.execute(vehicle.vin, breakInDetection), t);
}

function applyOptimisticSound(vehicle: Vehicle, selection: AlertSoundSelection): Vehicle {
  if (selection.target === AlertSoundTarget.BreakIn) {
    return { ...vehicle, break_in_alert_sound: selection.soundId };
  }

  return { ...vehicle, sentry_alert_sound: selection.soundId };
}

async function runAlertSoundUpdate(
  vehicle: Vehicle | undefined,
  selection: AlertSoundSelection,
  t: TranslationFunction
): Promise<VehicleActionResponse> {
  if (!vehicle) {
    throw new Error(t('vehicle.actionRefused'));
  }

  const payload =
    selection.target === AlertSoundTarget.BreakIn
      ? { breakInAlertSound: selection.soundId }
      : { sentryAlertSound: selection.soundId };

  return resolveSuccessfulResponse(await updateAlertSoundsUseCase.execute(vehicle.vin, payload), t);
}

function applyOptimisticAction(vehicle: Vehicle, action: VehicleMutationAction): Vehicle {
  if (action === VehicleAction.ConfigureTelemetry) {
    return { ...vehicle, sentry_mode_monitoring_enabled: true };
  }

  if (action === VehicleAction.DeleteTelemetry) {
    return { ...vehicle, sentry_mode_monitoring_enabled: false };
  }

  if (action === VehicleAction.ToggleBreakIn) {
    return { ...vehicle, break_in_monitoring_enabled: !vehicle.break_in_monitoring_enabled };
  }

  if (action === VehicleAction.ToggleAutoSentry) {
    return { ...vehicle, break_in_auto_sentry_mode_enabled: !vehicle.break_in_auto_sentry_mode_enabled };
  }

  return { ...vehicle, break_in_offensive_response: action };
}

async function runVehicleAction(
  vehicle: Vehicle | undefined,
  action: VehicleMutationAction,
  t: TranslationFunction
): Promise<VehicleActionResponse> {
  if (!vehicle) {
    throw new Error(t('vehicle.actionRefused'));
  }

  if (action === VehicleAction.ConfigureTelemetry) {
    return resolveTelemetryConfigurationResponse(await configureTelemetryUseCase.execute(vehicle.vin), t);
  }

  if (action === VehicleAction.DeleteTelemetry) {
    return resolveSuccessfulResponse(await deleteTelemetryConfigUseCase.execute(vehicle.vin), t);
  }

  if (action === VehicleAction.ToggleBreakIn) {
    return resolveSuccessfulResponse(
      await toggleBreakInMonitoringUseCase.execute(vehicle.vin, !vehicle.break_in_monitoring_enabled),
      t
    );
  }

  if (action === VehicleAction.ToggleAutoSentry) {
    return resolveSuccessfulResponse(
      await updateOffensiveResponseUseCase.execute(vehicle.vin, {
        autoSentryEnabled: !vehicle.break_in_auto_sentry_mode_enabled,
      }),
      t
    );
  }

  return resolveSuccessfulResponse(
    await updateOffensiveResponseUseCase.execute(vehicle.vin, { breakInOffensiveResponse: action }),
    t
  );
}
