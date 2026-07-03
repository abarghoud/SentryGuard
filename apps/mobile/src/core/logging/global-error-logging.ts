import { AppLoggerRequirements } from './app-logging.requirements';

interface ErrorUtilsLike {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
}

export function installGlobalErrorLogging(logger: AppLoggerRequirements): void {
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (!errorUtils) {
    return;
  }

  const previousHandler = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    logger.error('crash', isFatal ? 'Fatal JS error' : 'Unhandled JS error', describeError(error));
    previousHandler(error, isFatal);
  });
}

function describeError(error: unknown): string {
  if (!(error instanceof Error)) {
    return String(error);
  }

  const stackHead = error.stack?.split('\n').slice(1, 3).join(' ← ') ?? '';
  return `${error.name}: ${error.message}${stackHead ? ` @ ${stackHead.trim()}` : ''}`;
}
