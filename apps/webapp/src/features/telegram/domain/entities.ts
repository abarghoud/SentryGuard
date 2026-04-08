export interface TelegramLinkInfo {
  success: boolean;
  link: string;
  expires_at: string;
  expires_in_minutes: number;
}

export interface TelegramStatus {
  linked: boolean;
  status: 'not_configured' | 'pending' | 'linked' | 'expired';
  linked_at?: string;
  expires_at?: string;
  message: string;
}

export interface TelegramActionResponse {
  success: boolean;
  message: string;
}
