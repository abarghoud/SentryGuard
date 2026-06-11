import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as https from 'https';
import { AccessTokenService } from '../../auth/services/access-token.service';
import { DEFAULT_TESLA_API_BASE_URL } from '../telemetry-config.constants';

interface TeslaCommandResponse {
  success: boolean;
  message?: string;
}

@Injectable()
export class TeslaVehicleCommandService {
  private readonly logger = new Logger(TeslaVehicleCommandService.name);

  private readonly teslaApi: AxiosInstance = axios.create({
    baseURL: process.env.TESLA_API_BASE_URL ?? DEFAULT_TESLA_API_BASE_URL,
    httpsAgent: new https.Agent({ rejectUnauthorized: false }),
  });

  constructor(
    private readonly accessTokenService: AccessTokenService,
  ) {}

  async honkHorn(vin: string, userId: string): Promise<TeslaCommandResponse> {
    return this.sendVehicleCommand(vin, userId, 'honk_horn');
  }

  async remoteBoombox(vin: string, userId: string, sound: number): Promise<TeslaCommandResponse> {
    return this.sendVehicleCommand(vin, userId, 'remote_boombox', { sound });
  }

  private async sendVehicleCommand(
    vin: string,
    userId: string,
    command: string,
    body?: Record<string, any>,
  ): Promise<TeslaCommandResponse> {
    try {
      const hasScope = await this.accessTokenService.hasVehicleCommandsScope(userId);

      if (!hasScope) {
        this.logger.warn(`[VEHICLE_COMMAND] User ${userId} lacks vehicle_cmds scope`);
        return { success: false, message: 'Missing vehicle_cmds scope' };
      }

      const accessToken = await this.accessTokenService.getAccessTokenForUserId(userId);

      if (!accessToken) {
        this.logger.warn(`[VEHICLE_COMMAND] No access token for user ${userId}`);
        return { success: false, message: 'No access token available' };
      }

      const endpoint = `/api/1/vehicles/${vin}/command/${command}`;

      const response = await this.teslaApi.post(
        endpoint,
        body ?? {},
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );

      this.logger.log(`[VEHICLE_COMMAND] ${command} sent for VIN ${vin} (user: ${userId})`);

      return { success: response.data?.response ?? true };
    } catch (error: unknown) {
      const errorDetails = error instanceof Error ? error.message : String(error);
      this.logger.error(`[VEHICLE_COMMAND] Failed to send ${command} for VIN ${vin}: ${errorDetails}`);

      return { success: false, message: errorDetails };
    }
  }
}