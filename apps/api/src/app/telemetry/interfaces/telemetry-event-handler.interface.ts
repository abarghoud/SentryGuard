export const TelemetryEventHandlerSymbol = Symbol('TelemetryEventHandler');

export interface TelemetryEventHandler {
  handle(telemetryMessage: TelemetryMessage): Promise<void>;
}

export interface TelemetryMessage {
  data: Array<{
    key: string;
    value: {
      stringValue?: string;
      displayStateValue?: string;
    };
  }>;
  createdAt: string;
  vin: string;
  isResend: boolean;
}

