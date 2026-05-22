import { requestApi } from './api-client';

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

export function getTelegramStatus(): Promise<TelegramStatus> {
  return requestApi<TelegramStatus>('/telegram/status');
}

export function generateTelegramLink(): Promise<TelegramLinkInfo> {
  return requestApi<TelegramLinkInfo>('/telegram/generate-link', {
    method: 'POST',
  });
}

export function sendTelegramTestMessage(): Promise<{ message: string; success: boolean }> {
  return requestApi<{ message: string; success: boolean }>('/telegram/test-message', {
    method: 'POST',
  });
}
