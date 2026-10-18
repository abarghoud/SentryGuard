import {
  DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS,
  DEFAULT_BREAK_IN_SENSITIVITY,
  toBreakInDetectionFields,
} from '@sentryguard/vehicles-domain';

import { BreakInDetection, OffensiveResponse, Vehicle, VehicleActionResponse } from '../domain/entities';
import { VehicleRepositoryRequirements } from '../domain/vehicle.repository.requirements';

export class VehicleMockRepository implements VehicleRepositoryRequirements {
  private vehicles: Vehicle[] = [
    {
      id: 'demo-vehicle-id',
      vin: '5YJ3E1EA8KF123456',
      display_name: 'Model 3 - Demo',
      sentry_mode_monitoring_enabled: true,
      break_in_monitoring_enabled: true,
      break_in_offensive_response: OffensiveResponse.Disabled,
      break_in_auto_sentry_mode_enabled: false,
      break_in_reaction_delay_seconds: DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS,
      break_in_sensitivity: DEFAULT_BREAK_IN_SENSITIVITY,
      key_paired: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public async getVehicles(): Promise<Vehicle[]> {
    return [...this.vehicles];
  }

  public async configureTelemetry(vin: string): Promise<VehicleActionResponse> {
    const matchingVehicle = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (matchingVehicle) {
      matchingVehicle.sentry_mode_monitoring_enabled = true;
    }
    return { message: 'success', success: true };
  }

  public async deleteTelemetryConfig(vin: string): Promise<VehicleActionResponse> {
    const matchingVehicle = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (matchingVehicle) {
      matchingVehicle.sentry_mode_monitoring_enabled = false;
    }
    return { message: 'success', success: true };
  }

  public async toggleBreakInMonitoring(vin: string, shouldEnable: boolean): Promise<VehicleActionResponse> {
    const matchingVehicle = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (matchingVehicle) {
      matchingVehicle.break_in_monitoring_enabled = shouldEnable;
    }
    return { message: 'success', success: true };
  }

  public async updateAlertSounds(
    vin: string,
    payload: { breakInAlertSound?: string; sentryAlertSound?: string },
  ): Promise<VehicleActionResponse> {
    const matchingVehicle = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (matchingVehicle) {
      if (payload.sentryAlertSound !== undefined) {
        matchingVehicle.sentry_alert_sound = payload.sentryAlertSound;
      }
      if (payload.breakInAlertSound !== undefined) {
        matchingVehicle.break_in_alert_sound = payload.breakInAlertSound;
      }
    }
    return { message: 'success', success: true };
  }

  public async updateBreakInDetection(vin: string, breakInDetection: BreakInDetection): Promise<VehicleActionResponse> {
    this.vehicles = this.vehicles.map((vehicle) =>
      vehicle.vin === vin ? { ...vehicle, ...toBreakInDetectionFields(breakInDetection) } : vehicle
    );
    return { message: 'success', success: true };
  }

  public async updateOffensiveResponse(
    vin: string,
    payload: { breakInOffensiveResponse?: OffensiveResponse; autoSentryEnabled?: boolean },
  ): Promise<VehicleActionResponse> {
    const matchingVehicle = this.vehicles.find((vehicle) => vehicle.vin === vin);
    if (matchingVehicle) {
      if (payload.breakInOffensiveResponse !== undefined) {
        matchingVehicle.break_in_offensive_response = payload.breakInOffensiveResponse;
      }
      if (payload.autoSentryEnabled !== undefined) {
        matchingVehicle.break_in_auto_sentry_mode_enabled = payload.autoSentryEnabled;
      }
    }
    return { message: 'success', success: true };
  }
}
