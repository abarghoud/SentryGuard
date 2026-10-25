import type { JSX } from 'react';

import { DeleteAccountView } from '../DeleteAccountScreen';
import { TelegramSettingsView } from '../TelegramSettingsScreen';
import { AboutSentryGuardView } from './AboutSentryGuardView';
import { SettingsPage } from './settings-page.helpers';

interface SettingsPageViewProps {
  onClose(): void;
  onLogout(): Promise<void>;
  page: SettingsPage | null;
}

export function SettingsPageView({ onClose, onLogout, page }: SettingsPageViewProps): JSX.Element {
  switch (page) {
    case SettingsPage.DeleteAccount:
      return <DeleteAccountView onClose={onClose} onLogout={onLogout} />;
    case SettingsPage.Telegram:
      return <TelegramSettingsView onClose={onClose} />;
    default:
      return <AboutSentryGuardView />;
  }
}
