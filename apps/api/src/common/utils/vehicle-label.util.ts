export function resolveVehicleLabel(displayName: string | null | undefined, vin: string): string {
  return displayName || vin;
}
