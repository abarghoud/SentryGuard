'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  generateTelegramLink,
  getTelegramStatus,
  unlinkTelegram,
  sendTestMessage,
  hasToken,
  type TelegramLinkInfo,
  type TelegramStatus,
} from './api';

const TELEGRAM_LINK_STORAGE_KEY = 'telegram_link_info';

const isBrowser = () => typeof window !== 'undefined';

const clearStoredLinkInfo = () => {
  if (!isBrowser()) return;
  localStorage.removeItem(TELEGRAM_LINK_STORAGE_KEY);
};

const readStoredLinkInfo = (): TelegramLinkInfo | null => {
  if (!isBrowser()) return null;

  const raw = localStorage.getItem(TELEGRAM_LINK_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed: TelegramLinkInfo = JSON.parse(raw);
    const expiresAt = parsed.expires_at
      ? new Date(parsed.expires_at).getTime()
      : 0;

    if (expiresAt > Date.now()) {
      return parsed;
    }

    clearStoredLinkInfo();
    return null;
  } catch (err) {
    console.error('Failed to parse stored Telegram link info:', err);
    clearStoredLinkInfo();
    return null;
  }
};

const persistLinkInfo = (info: TelegramLinkInfo) => {
  if (!isBrowser()) return;
  localStorage.setItem(TELEGRAM_LINK_STORAGE_KEY, JSON.stringify(info));
};

export function useTelegram() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [linkInfo, setLinkInfo] = useState<TelegramLinkInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const hydrateLinkInfo = useCallback(() => {
    const storedLink = readStoredLinkInfo();
    setLinkInfo(storedLink);
  }, []);

  const fetchStatus = useCallback(async () => {
    if (!hasToken()) {
      setIsLoading(false);
      clearStoredLinkInfo();
      setLinkInfo(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const data = await getTelegramStatus();
      setStatus(data);

      if (data.status === 'pending') {
        hydrateLinkInfo();
      } else {
        clearStoredLinkInfo();
        setLinkInfo(null);
      }
    } catch (err) {
      console.error('Failed to fetch Telegram status:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to fetch Telegram status'
      );
    } finally {
      setIsLoading(false);
    }
  }, [hydrateLinkInfo]);

  const generateLink = async () => {
    setError(null);

    try {
      const data = await generateTelegramLink();
      persistLinkInfo(data);
      setLinkInfo(data);
      await fetchStatus();
      return data;
    } catch (err) {
      console.error('Failed to generate Telegram link:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to generate Telegram link'
      );
      return null;
    }
  };

  const unlink = async () => {
    setError(null);

    try {
      await unlinkTelegram();
      clearStoredLinkInfo();
      setLinkInfo(null);
      await fetchStatus();
      return true;
    } catch (err) {
      console.error('Failed to unlink Telegram:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to unlink Telegram'
      );
      return false;
    }
  };

  const sendTest = async (message?: string) => {
    setError(null);

    try {
      const result = await sendTestMessage(message);
      return result.success;
    } catch (err) {
      console.error('Failed to send test message:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to send test message'
      );
      return false;
    }
  };

  useEffect(() => {
    hydrateLinkInfo();
    fetchStatus();
  }, [fetchStatus, hydrateLinkInfo]);

  return {
    status,
    linkInfo,
    isLoading,
    error,
    fetchStatus,
    generateLink,
    unlink,
    sendTest,
  };
}
