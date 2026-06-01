export interface TelegramStatus {
  expires_at?: string;
  linked: boolean;
  linked_at?: string;
  message: string;
  status: 'not_configured' | 'pending' | 'linked' | 'expired';
}

export interface TelegramLinkInfo {
  expires_at: string;
  expires_in_minutes: number;
  link: string;
  success: boolean;
}

export interface TelegramTestMessageResult {
  message: string;
  success: boolean;
}
