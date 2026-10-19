export const MAX_VEHICLE_CLOCK_AHEAD_MS = 300_000;

export function isVehicleTimeTooFarAhead(vehicleTime: number): boolean {
  return vehicleTime > Date.now() + MAX_VEHICLE_CLOCK_AHEAD_MS;
}
