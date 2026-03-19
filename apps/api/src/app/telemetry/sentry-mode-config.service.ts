import { Injectable, Logger } from '@nestjs/common';
import { TelemetryConfigService } from './telemetry-config.service';
import { ConfigureTelemetryResult, TelemetryConfig } from './telemetry-config.types';
import { TELEMETRY_CONFIG, ERROR_MESSAGES } from './telemetry-config.constants';
import { extractErrorDetails } from './telemetry-config.helpers';

@Injectable()
export class SentryModeConfigService {
  private readonly logger = new Logger(SentryModeConfigService.name);

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
