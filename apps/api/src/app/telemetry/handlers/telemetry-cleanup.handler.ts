import { Injectable, Logger } from '@nestjs/common';
import type {
  ConsentRevokedHandler,
  ConsentRevokedEvent,
} from '../../consent/interfaces/consent-revoked-handler.interface';
import { TelemetryConfigService } from '../telemetry-config.service';

@Injectable()
export class TelemetryCleanupHandler implements ConsentRevokedHandler {
  private readonly logger = new Logger(TelemetryCleanupHandler.name);

  constructor(
    private readonly telemetryConfigService: TelemetryConfigService,
  ) {}

  async handleConsentRevoked(event: ConsentRevokedEvent): Promise<void> {
    this.logger.log(
      `Handling consent revoked event for user ${event.userId} with ${event.vehicleVins.length} vehicle(s)`,
    );

    const deletePromises = event.vehicleVins.map(async (vin) => {
      try {
        const result =
          await this.telemetryConfigService.deleteTelemetryConfigWithPartnerToken(
            vin,
          );
        if (result.success) {
          this.logger.log(
            `✅ Successfully deleted telemetry config for vehicle ${vin}`,
          );
        } else {
          this.logger.warn(
            `⚠️ Failed to delete telemetry config for vehicle ${vin}: ${result.message}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `❌ Error deleting telemetry config for vehicle ${vin}:`,
          error instanceof Error ? error.message : String(error),
        );
      }
    });

    await Promise.allSettled(deletePromises);

    this.logger.log(
      `✅ Finished processing consent revoked event for user ${event.userId}`,
    );
  }
}
