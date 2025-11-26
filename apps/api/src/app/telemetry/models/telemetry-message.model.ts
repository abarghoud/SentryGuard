import { IsArray, IsString, IsBoolean, IsOptional, ValidateNested, IsEnum, IsDateString, ArrayMinSize, IsObject } from 'class-validator';
import { Type } from 'class-transformer';

export enum SentryModeState {
  Armed = 'Armed',
  Aware = 'Aware',
  Idle = 'Idle',
  Off = 'Off',
  Panic = 'Panic',
  Quiet = 'Quiet',
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

  validateContainsSentryMode(): boolean {
    return this.data.some(datum => datum.key === 'SentryMode');
  }

  validateSentryModeValue(): boolean {
    const sentryDatum = this.data.find(d => d.key === 'SentryMode');
    if (!sentryDatum) return false;

    const stringValue = sentryDatum.value.stringValue;
    return stringValue !== undefined && Object.values(SentryModeState).includes(stringValue as SentryModeState);
  }
}
