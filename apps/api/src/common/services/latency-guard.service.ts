import { Injectable, Logger } from '@nestjs/common';

import { MAX_VEHICLE_CLOCK_AHEAD_MS } from '../utils/vehicle-clock.util';

export interface LatencyGuardOptions {
  vin: string;
  createdAt: string;
  logContext: string;
  envVarThresholdName: string;
  defaultThresholdMs: number;
  alertPrefix: string;
  actionName: string;
  intentionalDelayMs?: number;
}

@Injectable()
export class LatencyGuardService {
  private readonly clockSkewToleranceMs = MAX_VEHICLE_CLOCK_AHEAD_MS;

  public checkLatency(options: LatencyGuardOptions): boolean {
    const {
      vin,
      createdAt,
      logContext,
      envVarThresholdName,
      defaultThresholdMs,
      alertPrefix,
      actionName,
      intentionalDelayMs = 0,
    } = options;
    
    const logger = new Logger(logContext);
    
    const time = this.parseTimestamp(createdAt);
    if (time === null) {
      logger.error(`[${logContext}] Invalid createdAt timestamp received: "${createdAt}"`);
      return true;
    }
    
    const latency = Date.now() - time - intentionalDelayMs;
    if (latency < -this.clockSkewToleranceMs) {
      logger.error(`[${logContext}] Future createdAt timestamp received: "${createdAt}"`);
      return true;
    }
    
    const threshold = parseInt(process.env[envVarThresholdName] || defaultThresholdMs.toString(), 10);
    
    if (latency > threshold) {
      this.logBypassedResponse(logger, vin, latency, threshold, alertPrefix, actionName);
      return true;
    }
    
    return false;
  }

  private parseTimestamp(createdAt: string): number | null {
    const time = new Date(createdAt).getTime();
    return isNaN(time) ? null : time;
  }

  private logBypassedResponse(
    logger: Logger,
    vin: string,
    latency: number,
    threshold: number,
    alertPrefix: string,
    actionName: string,
  ): void {
    logger.warn(
      `[${alertPrefix}] ${actionName} bypassed for VIN ${vin} due to high latency: ${Math.max(0, latency)}ms (threshold: ${threshold}ms)`,
    );
  }
}
