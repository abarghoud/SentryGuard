import { VehiclesView } from '../views/VehiclesView';
import { useVehiclesQuery } from '../../../vehicles/di';

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
      onDeleteTelemetry={async (vin) => deleteTelemetryMutation.mutateAsync(vin)}
      onToggleBreakInMonitoring={async (vin, enable) => toggleBreakInMutation.mutateAsync({ vin, enable })}
      onToggleBreakInOffensive={async (vin, enabled) => {
        try {
          if (enabled) {
            await updateOffensiveResponseMutation.mutateAsync({ vin, breakInResponse: 'HONK' });
          } else {
            await updateOffensiveResponseMutation.mutateAsync({ vin, breakInResponse: 'DISABLED' });
          }
          return true;
        } catch {
          return false;
        }
      }}
    />
  );
}