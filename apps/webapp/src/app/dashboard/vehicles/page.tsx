'use client';

import { useVehiclesStore } from '../../../features/vehicles/di';
import { useAuth } from '../../../features/auth/presentation/hooks/use-auth';
import { VehiclesContainer } from '../../../features/vehicles/presentation/containers/VehiclesContainer';

export default function VehiclesPage() {
  return <VehiclesContainer useVehiclesStore={useVehiclesStore} useAuth={useAuth} />;
}
