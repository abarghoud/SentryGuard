import { MainStackParamList } from '../../core/navigation';

export enum SettingsPage {
  DeleteAccount = 'delete-account',
  Telegram = 'telegram',
}

const settingsPageRoutes = {
  [SettingsPage.DeleteAccount]: 'DeleteAccount',
  [SettingsPage.Telegram]: 'TelegramSettings',
} as const satisfies Record<SettingsPage, keyof MainStackParamList>;

export function resolveSettingsPageRoute(page: SettingsPage): (typeof settingsPageRoutes)[SettingsPage] {
  return settingsPageRoutes[page];
}
