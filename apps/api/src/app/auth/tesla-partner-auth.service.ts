import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface PartnerTokenResponse {
  access_token: string;
  expires_in: number;
  expiresAt: Date;
}

@Injectable()
export class TeslaPartnerAuthService {
  private readonly logger = new Logger(TeslaPartnerAuthService.name);
  private cachedToken: PartnerTokenResponse | null = null;

  async getPartnerToken(): Promise<string> {
    if (this.cachedToken && this.isTokenValid(this.cachedToken)) {
      this.logger.debug('Using cached partner token');
      return this.cachedToken.access_token;
    }

    this.logger.log('Fetching new partner token from Tesla API');

    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    const audience =
      process.env.TESLA_AUDIENCE ||
      'https://fleet-api.prd.na.vn.cloud.tesla.com';

    if (!clientId || !clientSecret) {
      throw new Error(
        'TESLA_CLIENT_ID or TESLA_CLIENT_SECRET not defined. Partner token cannot be obtained.',
      );
    }

    try {
      const response = await axios.post(
        'https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token',
        new URLSearchParams({
          grant_type: 'client_credentials',
          client_id: clientId,
          client_secret: clientSecret,
          audience: audience,
          scope: 'openid offline_access user_data vehicle_cmds vehicle_device_data',
        }),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );

      const { access_token, expires_in } = response.data;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + (expires_in || 3600));

      this.cachedToken = {
        access_token,
        expires_in,
        expiresAt,
      };

      this.logger.log(
        `✅ Partner token obtained. Expires at: ${expiresAt.toISOString()}`,
      );

      return access_token;
    } catch (error: unknown) {
      this.logger.error(
        'Failed to obtain partner token from Tesla API',
        error instanceof Error ? error.message : String(error),
      );
      throw new Error(
        `Failed to obtain partner token: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  private isTokenValid(token: PartnerTokenResponse): boolean {
    const now = new Date();
    const bufferMs = 5 * 60 * 1000;
    return token.expiresAt.getTime() > now.getTime() + bufferMs;
  }
}
