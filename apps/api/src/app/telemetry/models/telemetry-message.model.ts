import { IsArray, IsString, IsBoolean, IsOptional, ValidateNested, IsEnum, IsDateString, ArrayMinSize, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum SentryModeState {
  Off = 'SentryModeStateOff',
  Aware = 'SentryModeStateAware',
  Idle = 'SentryModeStateIdle',
  Armed = 'SentryModeStateArmed',
  Panic = 'SentryModeStatePanic',
  Quiet = 'SentryModeStateQuiet',
  Unknown = 'Unknown',
}

export class TelemetryValue {
  @IsOptional()
  @IsString()
  stringValue?: string;

  @IsOptional()
  @IsEnum(SentryModeState)
  sentryModeStateValue?: SentryModeState;
}

export class TelemetryDatum {
  @IsString()
  key!: string;

  @IsObject()
  @ValidateNested()
  @Type(() => TelemetryValue)
  value!: TelemetryValue;
}

export class TelemetryMessage {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TelemetryDatum)
  @ArrayMinSize(1)
  data!: TelemetryDatum[];

  @IsDateString()
  createdAt!: string;

  @IsString()
  vin!: string;

  @IsBoolean()
  isResend!: boolean;

  @IsOptional()
  @IsString()
  correlationId?: string;

  validateContainsSentryMode(): boolean {
    return this.data.some(datum => datum.key === 'SentryMode');
  }

  validateSentryModeValue(): boolean {
    const sentryDatum = this.data.find(d => d.key === 'SentryMode');
    if (!sentryDatum) return false;

    const { sentryModeStateValue } = sentryDatum.value;

    if (sentryModeStateValue !== undefined) {
      return Object.values(SentryModeState).includes(sentryModeStateValue);
    }

    return false;
  }

  calculateEndToEndLatency(): number | null {
    if (!this.createdAt || !this.correlationId) {
      return null;
    }

    try {
      const eventTime = new Date(this.createdAt).getTime();
      const currentTime = Date.now();
      return currentTime - eventTime;
    } catch {
      return null;
    }
  }

  isDelayed(thresholdMs = 1000): boolean {
    const latency = this.calculateEndToEndLatency();
    return latency !== null && latency > thresholdMs;
  }

  isProcessingDelayed(processingTimeMs: number, thresholdMs = 1000): boolean {
    return processingTimeMs > thresholdMs;
  }
}
