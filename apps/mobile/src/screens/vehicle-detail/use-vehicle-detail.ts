import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useHaptics } from '../../core/design/use-haptics';
import { getAuthProfileUseCase, getVehicleCommandsAuthorizationUseCase } from '../../features/auth/di';
import { Vehicle, VehicleActionResponse } from '../../features/vehicles/domain/entities';
import {
  configureTelemetryUseCase,
  deleteTelemetryConfigUseCase,
  getVehiclesUseCase,
  toggleBreakInMonitoringUseCase,
  updateOffensiveResponseUseCase,
} from '../../features/vehicles/di';
import {
  requestVehicleCommandsScope,
  resolveSuccessfulResponse,
  resolveTelemetryConfigurationResponse,
} from './vehicle-detail.helpers';
import { TranslationFunction, VehicleAction, VehicleMutationAction } from './vehicle-detail.types';

export function useVehicleDetail(vehicleId: string) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const haptics = useHaptics();
  const [feedback, setFeedback] = useState<string | null>(null);

  const vehiclesQuery = useQuery({
    queryFn: () => getVehiclesUseCase.execute(),
    queryKey: ['vehicles'],
  });
  const profileQuery = useQuery({
    queryFn: () => getAuthProfileUseCase.execute(),
    queryKey: ['auth-profile'],
  });
  const isBetaTester = profileQuery.data?.profile.isBetaTester === true;
  const vehicleCommandsQuery = useQuery({
    enabled: isBetaTester,
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

  return {
    actionMutation,
    feedback,
    isActionRunning: actionMutation.isPending,
    isBetaTester,
    scopeMutation,
    setFeedback,
    t,
    vehicle,
    vehicleCommandsAuthorized: vehicleCommandsQuery.data?.authorized === true,
  };
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

  return resolveSuccessfulResponse(await updateOffensiveResponseUseCase.execute(vehicle.vin, action), t);
}
