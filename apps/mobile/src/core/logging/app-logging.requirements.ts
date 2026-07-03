export enum AppLogLevel {
  Error,
  Info,
  Warning,
}

export interface AppLogEntry {
  count?: number;
  data?: string;
  level: AppLogLevel;
  message: string;
  tag: string;
  timestamp: string;
}

export interface AppLoggerRequirements {
  clear(): Promise<void>;
  error(tag: string, message: string, data?: unknown): void;
  exportLogs(): Promise<string>;
  info(tag: string, message: string, data?: unknown): void;
  initialize(): Promise<void>;
  warn(tag: string, message: string, data?: unknown): void;
}

export interface AppLogStorageRequirements {
  load(): Promise<AppLogEntry[]>;
  save(entries: AppLogEntry[]): Promise<void>;
}
