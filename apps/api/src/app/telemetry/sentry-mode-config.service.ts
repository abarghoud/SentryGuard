import { Injectable } from '@nestjs/common';
import { TelemetryConfigService } from './telemetry-config.service';
import { ConfigureTelemetryResult } from './telemetry-config.types';
import { TELEMETRY_CONFIG } from './telemetry-config.constants';

@Injectable()
export class SentryModeConfigService {
  constructor(
    private readonly telemetryConfigService: TelemetryConfigService
  ) {}

  async configureTelemetry(
    vin: string,
    userId: string
  ): Promise<ConfigureTelemetryResult | null> {
    const sentryModeInterval = parseInt(
      process.env.SENTRY_MODE_INTERVAL_SECONDS ?? String(TELEMETRY_CONFIG.DEFAULT_SENTRY_MODE_INTERVAL),
      10
    );

    const result = await this.telemetryConfigService.patchTelemetryConfig(
      vin,
      userId,
      { SentryMode: { interval_seconds: sentryModeInterval } }
    );

    if (result?.success) {
      await this.telemetryConfigService.updateVehicleTelemetryStatus(userId, vin, true);
    }

    return result;
  }
}
