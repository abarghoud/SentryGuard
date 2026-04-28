import { VehiclesView } from '../views/VehiclesView';
import { useVehiclesQuery } from '../../../vehicles/di';
import { useAuthQuery } from '../../../auth/di';

export function VehiclesContainer() {
  const { query: authQuery } = useAuthQuery();
  const profile = authQuery.data?.profile;
  
  const {
    query,
    configureTelemetryMutation,
    deleteTelemetryMutation,
    toggleBreakInMutation,
    updateOffensiveResponseMutation,
    testOffensiveResponseMutation,
  } = useVehiclesQuery();

  const { data: vehicles = [], isLoading, isFetching, error, refetch } = query;

  return (
    <VehiclesView
      vehicles={vehicles}
      isLoading={isLoading || isFetching}
      error={error?.message || null}
      isBetaTester={profile?.isBetaTester ?? false}
      onRefresh={refetch}
      onConfigureTelemetry={async (vin) => configureTelemetryMutation.mutateAsync(vin)}
      onDeleteTelemetry={async (vin) => deleteTelemetryMutation.mutateAsync(vin)}
      onToggleBreakInMonitoring={async (vin, enable) => toggleBreakInMutation.mutateAsync({ vin, enable })}
      onUpdateOffensiveResponse={async (vin, response) => updateOffensiveResponseMutation.mutateAsync({ vin, offensiveResponse: response })}
      onTestOffensiveResponse={async (vin) => testOffensiveResponseMutation.mutateAsync(vin)}
    />
  );
}
