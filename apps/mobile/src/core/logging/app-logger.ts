import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { AppLogEntry, AppLoggerRequirements, AppLogLevel, AppLogStorageRequirements } from './app-logging.requirements';

const maxLogEntries = 5000;
const maxDataLength = 300;
const flushDelayMs = 1000;

const levelLabels: Record<AppLogLevel, string> = {
  [AppLogLevel.Error]: 'ERROR',
  [AppLogLevel.Info]: 'INFO',
  [AppLogLevel.Warning]: 'WARN',
};

export class AppLogger implements AppLoggerRequirements {
  private entries: AppLogEntry[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;

  public constructor(private readonly storage: AppLogStorageRequirements) {}

  public async initialize(): Promise<void> {
    const persistedEntries = await this.storage.load();
    this.entries = [...persistedEntries, ...this.entries].slice(-maxLogEntries);
    this.info('app', `Session started (v${this.resolveAppVersion()}, ${this.resolvePlatformDescription()})`);
  }

  public info(tag: string, message: string, data?: unknown): void {
    this.append(AppLogLevel.Info, tag, message, data);
  }

  public warn(tag: string, message: string, data?: unknown): void {
    this.append(AppLogLevel.Warning, tag, message, data);
  }

  public error(tag: string, message: string, data?: unknown): void {
    this.append(AppLogLevel.Error, tag, message, data);
  }

  public async exportLogs(): Promise<string> {
    await this.persistEntries();
    return [this.buildExportHeader(), ...this.entries.map((entry) => this.formatEntry(entry))].join('\n');
  }

  public async clear(): Promise<void> {
    this.entries = [];
    await this.persistEntries();
  }

  private append(level: AppLogLevel, tag: string, message: string, data?: unknown): void {
    const entry = this.buildEntry(level, tag, message, data);

    if (this.isRepeatOfLastEntry(entry)) {
      this.entries[this.entries.length - 1] = { ...entry, count: (this.entries[this.entries.length - 1].count ?? 1) + 1 };
    } else {
      this.entries = [...this.entries, entry].slice(-maxLogEntries);
    }

    this.schedulePersistence(level);
  }

  private buildEntry(level: AppLogLevel, tag: string, message: string, data?: unknown): AppLogEntry {
    return {
      ...(data === undefined ? {} : { data: this.serializeData(data) }),
      level,
      message,
      tag,
      timestamp: new Date().toISOString(),
    };
  }

  private isRepeatOfLastEntry(entry: AppLogEntry): boolean {
    const lastEntry = this.entries[this.entries.length - 1];
    return !!lastEntry && lastEntry.level === entry.level && lastEntry.tag === entry.tag && lastEntry.message === entry.message;
  }

  private schedulePersistence(level: AppLogLevel): void {
    if (level === AppLogLevel.Error) {
      void this.persistEntries();
      return;
    }

    this.scheduleFlush();
  }

  private serializeData(data: unknown): string {
    try {
      const serialized = typeof data === 'string' ? data : JSON.stringify(data);
      return (serialized ?? String(data)).slice(0, maxDataLength);
    } catch {
      return String(data).slice(0, maxDataLength);
    }
  }

  private scheduleFlush(): void {
    if (this.flushTimer) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.persistEntries();
    }, flushDelayMs);
  }

  private async persistEntries(): Promise<void> {
    try {
      await this.storage.save(this.entries);
    } catch {
      return;
    }
  }

  private buildExportHeader(): string {
    return [
      'SentryGuard debug logs',
      `Exported at: ${new Date().toISOString()}`,
      `App version: ${this.resolveAppVersion()}`,
      `Platform: ${this.resolvePlatformDescription()}`,
      `Entries: ${this.entries.length}`,
      '---',
    ].join('\n');
  }

  private formatEntry(entry: AppLogEntry): string {
    const dataSuffix = entry.data ? ` | ${entry.data}` : '';
    const repeatSuffix = entry.count && entry.count > 1 ? ` (×${entry.count})` : '';
    return `${entry.timestamp} [${levelLabels[entry.level]}] ${entry.tag}: ${entry.message}${dataSuffix}${repeatSuffix}`;
  }

  private resolveAppVersion(): string {
    return Constants.expoConfig?.version ?? 'unknown';
  }

  private resolvePlatformDescription(): string {
    return `${Platform.OS} ${String(Platform.Version ?? '')}`.trim();
  }
}
