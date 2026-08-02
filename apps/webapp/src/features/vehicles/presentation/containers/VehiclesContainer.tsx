import { VehiclesView } from '../views/VehiclesView';
import { useVehiclesQuery } from '../../../vehicles/di';
import { VehicleActionOutcome } from '../../domain/entities';

const resolveActionOutcome = async (
  action: Promise<unknown>
): Promise<VehicleActionOutcome> => {
  try {
    await action;
    return { success: true };
  } catch (error: unknown) {
    return {
      success: false,
      message: error instanceof Error ? error.message : undefined,
    };
  }
};

export function VehiclesContainer() {
  const {
    query,
    configureTelemetryMutation,
    deleteTelemetryMutation,
    toggleBreakInMutation,
    updateOffensiveResponseMutation,
  } = useVehiclesQuery();

  const { data: vehicles = [], isLoading, isFetching, error, refetch } = query;

  return (
    <VehiclesView
      vehicles={vehicles}
      isLoading={isLoading || isFetching}
      error={error?.message || null}
      onRefresh={refetch}
      onConfigureTelemetry={async (vin) => configureTelemetryMutation.mutateAsync(vin)}
      onDeleteTelemetry={async (vin) => resolveActionOutcome(deleteTelemetryMutation.mutateAsync(vin))}
      onToggleBreakInMonitoring={async (vin, enable) =>
        resolveActionOutcome(toggleBreakInMutation.mutateAsync({ vin, enable }))
      }
      onUpdateBreakInOffensive={async (vin, breakInResponse) =>
        resolveActionOutcome(updateOffensiveResponseMutation.mutateAsync({ vin, breakInResponse }))
      }
    />
  );
}
