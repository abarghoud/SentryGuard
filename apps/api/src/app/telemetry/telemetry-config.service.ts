import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as https from 'https';
import { AccessTokenService } from '../auth/services/access-token.service';
import { AuthService } from '../auth/auth.service';
import { TeslaPartnerAuthService } from '../auth/tesla-partner-auth.service';
import { Vehicle } from '../../entities/vehicle.entity';
import {
  DeleteTelemetryConfigResponse,
  ConfigureTelemetryResult,
  FleetTelemetryConfigResponse,
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
} from './telemetry-config.constants';
import { SkippedVehicleInfo } from './skipped-telemetry-config-vehicle';
import {
  extractErrorDetails,
  is404Error,
  isTokenRevokedError,
} from './telemetry-config.helpers';
import { TokenRevokedException } from '../../common/exceptions/token-revoked.exception';

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
    private readonly accessTokenService: AccessTokenService,
    private readonly authService: AuthService,
    private readonly partnerAuthService: TeslaPartnerAuthService,
    @InjectRepository(Vehicle)
    private readonly vehicleRepository: Repository<Vehicle>
  ) { }

  private async getAccessToken(userId: string): Promise<string> {
    const token = await this.accessTokenService.getAccessTokenForUserId(userId);
    if (!token) {
      throw new UnauthorizedException(ERROR_MESSAGES.INVALID_TOKEN);
    }
    return token;
  }

  private async handleTokenRevocation(userId: string, error: unknown): Promise<void> {
    if (!isTokenRevokedError(error)) {
      return;
    }

    this.logger.warn(`🔒 Detected revoked Tesla token for user: ${userId}`);

    await this.authService.invalidateUserTokens(userId);

    throw new TokenRevokedException(userId);
  }


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
            sentry_mode_monitoring_enabled: dbVehicle?.sentry_mode_monitoring_enabled ?? false,
            break_in_monitoring_enabled: dbVehicle?.break_in_monitoring_enabled ?? false,
            key_paired: keyPaired,
          };
        });
      }

      return vehicles.map((vehicle): TeslaVehicleWithStatus => ({
        ...vehicle,
        sentry_mode_monitoring_enabled: false,
        break_in_monitoring_enabled: false,
        key_paired: false,
      }));
    } catch (error: unknown) {
      this.logger.error(
        ERROR_MESSAGES.ERROR_FETCHING_VEHICLES,
        extractErrorDetails(error)
      );

      await this.handleTokenRevocation(userId, error);

      return [];
    }
  }

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

      await this.vehicleRepository.upsert(
        {
          userId,
          vin: teslaVehicle.vin,
          display_name: teslaVehicle.display_name ?? teslaVehicle.vin,
          sentry_mode_monitoring_enabled: isTelemetryConfigured,
        },
        { conflictPaths: ['userId', 'vin'], skipUpdateIfNoValuesChanged: true }
      );
      this.logger.log(SUCCESS_MESSAGES.VEHICLE_UPDATED(teslaVehicle.vin, isTelemetryConfigured));
    }

    return telemetryConfigsMap;
  }

  private async getUserVehiclesFromDB(userId: string): Promise<Vehicle[]> {
    return await this.vehicleRepository.find({
      where: { userId },
      order: { created_at: 'ASC' },
    });
  }

  async patchTelemetryConfig(
    vin: string,
    userId: string,
    fieldsToUpsert: Partial<Record<string, { interval_seconds: number }>>,
    fieldsToDelete: string[] = []
  ): Promise<ConfigureTelemetryResult | null> {
    try {
      const currentConfig = await this.checkTelemetryConfig(vin, userId);

      const configPayload: NonNullable<TelemetryConfig['config']> = currentConfig?.config ? { ...currentConfig.config } : {
        ca: process.env.LETS_ENCRYPT_CERTIFICATE ? Buffer.from(process.env.LETS_ENCRYPT_CERTIFICATE, 'base64').toString('utf8') : '',
        hostname: process.env.TESLA_FLEET_TELEMETRY_SERVER_HOSTNAME || '',
        port: TELEMETRY_CONFIG.PORT,
        fields: {},
      };

      if (!configPayload.fields) {
        configPayload.fields = {};
      }

      for (const [field, value] of Object.entries(fieldsToUpsert)) {
        if (value !== undefined) {
          configPayload.fields[field] = value;
        }
      }

      for (const field of fieldsToDelete) {
        delete configPayload.fields[field];
      }

      if (Object.keys(configPayload.fields).length === 0) {
        await this.deleteTelemetryConfig(vin, userId);
        return { success: true, skippedVehicle: null, response: { response: {} } } as unknown as ConfigureTelemetryResult;
      }

      return await this.pushTelemetryConfig(vin, userId, configPayload);
    } catch (error: unknown) {
      this.logger.error(`Error patching telemetry config for ${vin}:`, extractErrorDetails(error));
      return null;
    }
  }

  async updateVehicleTelemetryStatus(
    userId: string,
    vin: string,
    enabled: boolean
  ): Promise<void> {
    const vehicle = await this.vehicleRepository.findOne({
      where: { userId, vin },
    });

    if (vehicle) {
      vehicle.sentry_mode_monitoring_enabled = enabled;
      await this.vehicleRepository.save(vehicle);
      this.logger.log(SUCCESS_MESSAGES.TELEMETRY_STATUS_UPDATED(vin, enabled));
    }
  }

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

      await this.handleTokenRevocation(userId, error);

      return null;
    }
  }

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

      await this.handleTokenRevocation(userId, error);

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

  async deleteTelemetryConfigWithPartnerToken(
    vin: string
  ): Promise<DeleteTelemetryConfigResponse> {
    try {
      const partnerToken = await this.partnerAuthService.getPartnerToken();

      await this.teslaApi.delete(
        TESLA_API_ENDPOINTS.VEHICLE_TELEMETRY_CONFIG(vin),
        {
          headers: { Authorization: `Bearer ${partnerToken}` },
        }
      );

      this.logger.log(SUCCESS_MESSAGES.CONFIG_DELETED(vin));

      return {
        success: true,
        message: SUCCESS_MESSAGES.CONFIG_DELETED_SUCCESSFULLY,
      };
    } catch (error: unknown) {
      if (is404Error(error)) {
        this.logger.log(INFO_MESSAGES.NO_CONFIG_FOUND(vin));

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


  private async pushTelemetryConfig(
    vin: string,
    userId: string,
    config: TelemetryConfig['config']
  ): Promise<ConfigureTelemetryResult | null> {
    try {
      const accessToken = await this.getAccessToken(userId);

      const requestPayload: TelemetryConfigRequest = {
        config: config as TelemetryConfigRequest['config'],
        vins: [vin],
      };

      const response = await this.teslaApi.post<TeslaApiResponse<FleetTelemetryConfigResponse>>(
        TESLA_API_ENDPOINTS.FLEET_TELEMETRY_CONFIG,
        requestPayload,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const skippedVehicle = new SkippedVehicleInfo(
        vin,
        response.data as TeslaApiResponse<FleetTelemetryConfigResponse>
      ).get();

      if (skippedVehicle) {
        this.logger.warn(`⚠️ Vehicle ${vin} was skipped by Tesla API: ${skippedVehicle.reason}`);
        return {
          success: false,
          skippedVehicle,
          response: response.data as TeslaApiResponse<FleetTelemetryConfigResponse>,
        };
      }

      this.logger.log(SUCCESS_MESSAGES.TELEMETRY_CONFIGURED(vin));

      return {
        success: true,
        skippedVehicle: null,
        response: response.data as TeslaApiResponse<FleetTelemetryConfigResponse>,
      };
    } catch (error: unknown) {
      this.logger.error(
        ERROR_MESSAGES.ERROR_CONFIGURING_VIN(vin),
        extractErrorDetails(error)
      );

      await this.handleTokenRevocation(userId, error);

      return null;
    }
  }
}
