import { TelemetryMessage } from '../models/telemetry-message.model';

export const TelemetryEventHandlerSymbol = Symbol('TelemetryEventHandler');

export interface TelemetryEventHandler {
  handle(telemetryMessage: TelemetryMessage): Promise<void>;
}

