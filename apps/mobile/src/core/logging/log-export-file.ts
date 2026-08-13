import { File, Paths } from 'expo-file-system';

export function buildLogsExportFileName(): string {
  return `sentryguard-logs-${new Date().toISOString().slice(0, 10)}.txt`;
}

export function writeLogsExportFile(logs: string): string {
  const exportFile = new File(Paths.cache, buildLogsExportFileName());
  exportFile.write(logs);
  return exportFile.uri;
}
