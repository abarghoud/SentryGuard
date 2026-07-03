import { AppLogger } from './app-logger';
import { resolveAppLogStorage } from './app-log-storage';
import { AppLoggerRequirements } from './app-logging.requirements';

export const appLogger: AppLoggerRequirements = new AppLogger(resolveAppLogStorage());

export * from './app-logging.requirements';
export * from './global-error-logging';
export * from './log-export-file';
