import { Injectable, LoggerService } from '@nestjs/common';
import { OciLoggingService } from '../services/oci-logging.service';

interface LogData extends Record<string, unknown> {
  timestamp: string;
  level: string;
  context?: string;
  message: string;
  rawMessage?: Record<string, unknown>;
  optionalParams?: any[];
}

@Injectable()
export class OciLoggerService implements LoggerService {
  constructor(private readonly ociLoggingService: OciLoggingService) {}

  private formatMessage(level: string, message: unknown, ...optionalParams: any[]): LogData {
    const timestamp = new Date().toISOString();
    const context = optionalParams.length > 0 && typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;

    return {
      timestamp,
      level,
      context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      rawMessage: typeof message === 'string' ? undefined : message as Record<string, unknown>,
      optionalParams: optionalParams.length > 0 ? optionalParams : undefined
    };
  }

  private formatConsole(level: string, message: unknown, context?: string): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? `[${context}]` : '';
    const formattedMessage = typeof message === 'object' ? JSON.stringify(message) : String(message);
    return `${timestamp} ${level.padEnd(5)} ${contextStr} ${formattedMessage}`;
  }

  log(message: unknown, ...optionalParams: any[]): void {
    const logData = this.formatMessage('LOG', message, ...optionalParams);
    const context = optionalParams.length > 0 && typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    console.log(this.formatConsole('LOG', message, context));
    this.ociLoggingService.sendLog(logData).catch(this.handleFailure.bind(this));
  }

  error(message: unknown, ...optionalParams: any[]): void {
    const logData = this.formatMessage('ERROR', message, ...optionalParams);
    const context = optionalParams.length > 0 && typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    console.error(this.formatConsole('ERROR', message, context));
    this.ociLoggingService.sendLog(logData).catch(this.handleFailure.bind(this));
  }

  warn(message: unknown, ...optionalParams: any[]): void {
    const logData = this.formatMessage('WARN', message, ...optionalParams);
    const context = optionalParams.length > 0 && typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    console.warn(this.formatConsole('WARN', message, context));
    this.ociLoggingService.sendLog(logData).catch(this.handleFailure.bind(this));
  }

  debug(message: unknown, ...optionalParams: any[]): void {
    const logData = this.formatMessage('DEBUG', message, ...optionalParams);
    const context = optionalParams.length > 0 && typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    console.debug(this.formatConsole('DEBUG', message, context));
    this.ociLoggingService.sendLog(logData).catch(this.handleFailure.bind(this));
  }

  verbose(message: unknown, ...optionalParams: any[]): void {
    const logData = this.formatMessage('VERBOSE', message, ...optionalParams);
    const context = optionalParams.length > 0 && typeof optionalParams[0] === 'string' ? optionalParams[0] : undefined;
    console.debug(this.formatConsole('VERBOSE', message, context));
    this.ociLoggingService.sendLog(logData).catch(this.handleFailure.bind(this));
  }

  private handleFailure(): void {
    // do nothing to avoid blocking the application
  }
}
