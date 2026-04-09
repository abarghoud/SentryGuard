import { useEffect } from 'react';
import { VehiclesView } from '../views/VehiclesView';
import { VehiclesState } from '../store/vehicles.store';
import { UseBoundStore, StoreApi } from 'zustand';

import { AuthHookRequirements } from '../../../auth/presentation/hooks/auth-hook.requirements';

interface VehiclesContainerProps {
  useVehiclesStore: UseBoundStore<StoreApi<VehiclesState>>;
  useAuth: () => AuthHookRequirements;
}

export function VehiclesContainer({ useVehiclesStore, useAuth }: VehiclesContainerProps) {
  const { profile } = useAuth();
  const vehicles = useVehiclesStore((state) => state.vehicles);
  const isLoading = useVehiclesStore((state) => state.isLoading);
  const error = useVehiclesStore((state) => state.error);
  
  const fetchVehicles = useVehiclesStore((state) => state.fetchVehicles);
  const configureTelemetryForVehicle = useVehiclesStore((state) => state.configureTelemetryForVehicle);
  const deleteTelemetryForVehicle = useVehiclesStore((state) => state.deleteTelemetryForVehicle);
  const toggleBreakInMonitoringForVehicle = useVehiclesStore((state) => state.toggleBreakInMonitoringForVehicle);

  useEffect(() => {
    fetchVehicles();
  }, [fetchVehicles]);

  return (
    <VehiclesView
      vehicles={vehicles}
      isLoading={isLoading}
      error={error}
      isBetaTester={profile?.isBetaTester ?? false}
      onRefresh={fetchVehicles}
      onConfigureTelemetry={configureTelemetryForVehicle}
      onDeleteTelemetry={deleteTelemetryForVehicle}
      onToggleBreakInMonitoring={toggleBreakInMonitoringForVehicle}
    />
  );
}
