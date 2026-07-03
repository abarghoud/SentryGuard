import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

import { AppLogEntry, AppLogStorageRequirements } from './app-logging.requirements';

const logFileName = 'sentryguard-debug-logs.json';
const webStorageKey = 'sentryguard.debugLogs';

export class FileAppLogStorage implements AppLogStorageRequirements {
  public async load(): Promise<AppLogEntry[]> {
    try {
      const logFile = new File(Paths.document, logFileName);
      return logFile.exists ? parseLogEntries(await logFile.text()) : [];
    } catch {
      return [];
    }
  }

  public async save(entries: AppLogEntry[]): Promise<void> {
    try {
      new File(Paths.document, logFileName).write(JSON.stringify(entries));
    } catch {
      return;
    }
  }
}

export class WebAppLogStorage implements AppLogStorageRequirements {
  public async load(): Promise<AppLogEntry[]> {
    return parseLogEntries(globalThis.localStorage?.getItem(webStorageKey) ?? '');
  }

  public async save(entries: AppLogEntry[]): Promise<void> {
    try {
      globalThis.localStorage?.setItem(webStorageKey, JSON.stringify(entries));
    } catch {
      return;
    }
  }
}

export function resolveAppLogStorage(): AppLogStorageRequirements {
  return Platform.OS === 'web' ? new WebAppLogStorage() : new FileAppLogStorage();
}

function parseLogEntries(rawEntries: string): AppLogEntry[] {
  try {
    const parsed = JSON.parse(rawEntries) as unknown;
    return Array.isArray(parsed) ? (parsed as AppLogEntry[]) : [];
  } catch {
    return [];
  }
}
