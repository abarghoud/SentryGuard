import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as https from 'https';
import { AuthService } from '../auth/auth.service';
import { Vehicle } from '../../entities/vehicle.entity';
import {
  DeleteTelemetryConfigResponse,
  TelemetryConfig,
  TelemetryConfigRequest,
  TeslaApiResponse,
  TeslaVehicle,
  TeslaVehicleWithStatus,
} from './telemetry-config.types';
import {
  DEFAULT_TESLA_API_BASE_URL,
  ERROR_MESSAGES,
  GENERIC_ERROR_MESSAGES,
  INFO_MESSAGES,
  SUCCESS_MESSAGES,
  TELEMETRY_CONFIG,
  TESLA_API_ENDPOINTS,
  WARNING_MESSAGES,
} from './telemetry-config.constants';
import { extractErrorDetails, is404Error } from './telemetry-config.helpers';

@Injectable()
export class TelemetryConfigService {
  private readonly logger = new Logger(TelemetryConfigService.name);

  // SECURITY NOTE: rejectUnauthorized: false is acceptable here because tesla-vehicle-command
  // is a local service on the same Docker network with a self-signed certificate.
  // ⚠️ DO NOT use this configuration for calls to the public Internet!
  private readonly teslaApi = axios.create({
    baseURL: process.env.TESLA_API_BASE_URL ?? DEFAULT_TESLA_API_BASE_URL,
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) {}

  /**
   * Retrieves the access token for a user
   */
  private async getAccessToken(userId: string): Promise<string> {
    const token = await this.authService.getAccessTokenForUserId(userId);
    if (!token) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
    return token;
  }

  /**
   * Fetches the vehicle list from Tesla API and syncs them to the database
   */
  async getVehicles(userId: string): Promise<TeslaVehicleWithStatus[]> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const response = await this.teslaApi.get<TeslaApiResponse<TeslaVehicle[]>>(
        TESLA_API_ENDPOINTS.VEHICLES,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const vehicles = response.data.response;

      if (userId && vehicles.length > 0) {
        const telemetryConfigs = await this.syncVehiclesToDatabase(userId, vehicles);
        const dbVehicles = await this.getUserVehiclesFromDB(userId);

        // Check key_paired status from the first vehicle (sufficient for the account)
        let keyPaired = false;
        if (telemetryConfigs.size > 0) {
          const firstConfig = telemetryConfigs.get(vehicles[0].vin);
          keyPaired = firstConfig?.key_paired ?? false;
        }

        return vehicles.map((teslaVehicle: TeslaVehicle): TeslaVehicleWithStatus => {
          const dbVehicle = dbVehicles.find(
            (dbV) => dbV.vin === teslaVehicle.vin
          );
          return {
            ...teslaVehicle,
            telemetry_enabled: dbVehicle?.telemetry_enabled ?? false,
            key_paired: keyPaired,
          };
        });
      }

      return vehicles.map((vehicle): TeslaVehicleWithStatus => ({
        ...vehicle,
        telemetry_enabled: false,
        key_paired: false,
      }));
    } catch (error: unknown) {
      this.logger.error(
        ERROR_MESSAGES.ERROR_FETCHING_VEHICLES,
        extractErrorDetails(error)
      );
      return [];
    }
  }

  /**
   * Syncs Tesla API vehicles with the database
   * @returns Map of telemetry configurations by VIN
   */
  private async syncVehiclesToDatabase(
    userId: string,
    teslaVehicles: TeslaVehicle[]
  ): Promise<Map<string, TelemetryConfig | null>> {
    const telemetryConfigsMap = new Map<string, TelemetryConfig | null>();

    for (const teslaVehicle of teslaVehicles) {
      const telemetryConfig = await this.checkTelemetryConfig(
        teslaVehicle.vin,
        userId
      );
      telemetryConfigsMap.set(teslaVehicle.vin, telemetryConfig);

      const isTelemetryConfigured = telemetryConfig?.config !== null && telemetryConfig?.config !== undefined;

      const existingVehicle = await this.vehicleRepository.findOne({
        where: { userId, vin: teslaVehicle.vin },
      });

      if (!existingVehicle) {
        const vehicle = this.vehicleRepository.create({
          userId,
          vin: teslaVehicle.vin,
          display_name: teslaVehicle.display_name ?? teslaVehicle.vin,
          model: teslaVehicle.vehicle_state?.car_type ?? undefined,
          telemetry_enabled: isTelemetryConfigured,
        });

        await this.vehicleRepository.save(vehicle);
        this.logger.log(SUCCESS_MESSAGES.VEHICLE_ADDED(teslaVehicle.vin, isTelemetryConfigured));
      } else {
        if (
          teslaVehicle.display_name &&
          existingVehicle.display_name !== teslaVehicle.display_name
        ) {
          existingVehicle.display_name = teslaVehicle.display_name;
        }

        existingVehicle.telemetry_enabled = isTelemetryConfigured;
        await this.vehicleRepository.save(existingVehicle);
        this.logger.log(SUCCESS_MESSAGES.VEHICLE_UPDATED(teslaVehicle.vin, isTelemetryConfigured));
      }
    }

    return telemetryConfigsMap;
  }

  /**
   * Retrieves a user's vehicles from the database
   */
  async getUserVehiclesFromDB(userId: string): Promise<Vehicle[]> {
    return await this.vehicleRepository.find({
      where: { userId },
      order: { created_at: 'ASC' },
    });
  }

  /**
   * Configures telemetry for a specific vehicle
   */
  async configureTelemetry(
    vin: string,
    userId: string
  ): Promise<TeslaApiResponse | null> {
    const base64CAKey = process.env.LETS_ENCRYPT_CERTIFICATE;

    if (!base64CAKey) {
      this.logger.error(ERROR_MESSAGES.LETS_ENCRYPT_NOT_DEFINED);
      return null;
    }

    const hostname = process.env.TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME;

    if (!hostname) {
      this.logger.error(ERROR_MESSAGES.HOSTNAME_NOT_DEFINED);
      return null;
    }

    const decodedKey = Buffer.from(base64CAKey, 'base64').toString('utf8');

    try {
      const accessToken = await this.getAccessToken(userId);

      const sentryModeInterval = parseInt(
        process.env.SENTRY_MODE_INTERVAL_SECONDS ?? String(TELEMETRY_CONFIG.DEFAULT_SENTRY_MODE_INTERVAL),
        10
      );

      const requestPayload: TelemetryConfigRequest = {
        config: {
          ca: decodedKey,
          hostname: hostname,
          port: TELEMETRY_CONFIG.PORT,
          fields: {
            [TELEMETRY_CONFIG.FIELD_NAME]: {
              interval_seconds: sentryModeInterval
            },
          },
        },
        vins: [vin],
      };

      const response = await this.teslaApi.post<TeslaApiResponse>(
        TESLA_API_ENDPOINTS.FLEET_TELEMETRY_CONFIG,
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      this.logger.log(SUCCESS_MESSAGES.TELEMETRY_CONFIGURED(vin));

      await this.updateVehicleTelemetryStatus(userId, vin, true);

      return response.data;
    } catch (error: unknown) {
      this.logger.error(
        ERROR_MESSAGES.ERROR_CONFIGURING_VIN(vin),
        extractErrorDetails(error)
      );
      return null;
    }
  }

  /**
   * Updates the telemetry status of a vehicle
   */
  async updateVehicleTelemetryStatus(
    userId: string,
    vin: string,
    enabled: boolean
  ): Promise<void> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { userId, vin },
    });

    if (vehicle) {
      vehicle.telemetry_enabled = enabled;
      await this.vehicleRepository.save(vehicle);
      this.logger.log(SUCCESS_MESSAGES.TELEMETRY_STATUS_UPDATED(vin, enabled));
    }
  }

  /**
   * Checks the telemetry configuration for a vehicle
   */
  async checkTelemetryConfig(
    vin: string,
    userId: string
  ): Promise<TelemetryConfig | null> {
    try {
      const accessToken = await this.getAccessToken(userId);
      const response = await this.teslaApi.get<TeslaApiResponse<TelemetryConfig>>(
        TESLA_API_ENDPOINTS.VEHICLE_TELEMETRY_CONFIG(vin),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      this.logger.debug(`Config for ${vin}:`, response.data.response);
      return response.data.response;
    } catch (error: unknown) {
      this.logger.error(
        ERROR_MESSAGES.ERROR_CHECKING_CONFIG(vin),
        extractErrorDetails(error)
      );
      return null;
    }
  }

  /**
   * Deletes the telemetry configuration for a vehicle
   */
  async deleteTelemetryConfig(
    vin: string,
    userId: string
  ): Promise<DeleteTelemetryConfigResponse> {
    try {
      const accessToken = await this.getAccessToken(userId);

      await this.teslaApi.delete(
        TESLA_API_ENDPOINTS.VEHICLE_TELEMETRY_CONFIG(vin),
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      await this.updateVehicleTelemetryStatus(userId, vin, false);

      this.logger.log(SUCCESS_MESSAGES.CONFIG_DELETED(vin));

      return {
        success: true,
        message: SUCCESS_MESSAGES.CONFIG_DELETED_SUCCESSFULLY,
      };
    } catch (error: unknown) {
      if (is404Error(error)) {
        this.logger.log(INFO_MESSAGES.NO_CONFIG_FOUND(vin));

        await this.updateVehicleTelemetryStatus(userId, vin, false);

        return {
          success: true,
          message: INFO_MESSAGES.NO_CONFIG_FOUND_ALREADY_DELETED,
        };
      }

      this.logger.error(
        ERROR_MESSAGES.ERROR_DELETING_CONFIG(vin),
        extractErrorDetails(error)
      );

      return {
        success: false,
        message: GENERIC_ERROR_MESSAGES.ERROR_DELETING_TELEMETRY,
      };
    }
  }

  /**
   * Configures telemetry for all available vehicles
   */
  async configureAllVehicles(userId: string): Promise<void> {
    this.logger.log(INFO_MESSAGES.FETCHING_VEHICLES);
    const vehicles = await this.getVehicles(userId);

    if (vehicles.length === 0) {
      this.logger.warn(WARNING_MESSAGES.NO_VEHICLES_FOUND);
      return;
    }

    this.logger.debug(
      'Vehicles found:',
      vehicles.map((v) => v.vin)
    );

    for (const vehicle of vehicles) {
      this.logger.log(INFO_MESSAGES.CONFIGURING_VIN(vehicle.vin));
      const configResult = await this.configureTelemetry(vehicle.vin, userId);
      this.logger.debug('configResult', configResult);

      const checkResult = await this.checkTelemetryConfig(vehicle.vin, userId);
      if (checkResult) {
        this.logger.debug(
          SUCCESS_MESSAGES.CONFIG_VERIFIED(vehicle.vin),
          checkResult.config?.fields
        );
      }
    }
  }
}
