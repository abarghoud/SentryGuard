'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  generateTelegramLink, 
  getTelegramStatus, 
  unlinkTelegram,
  sendTestMessage,
  type TelegramLinkInfo, 
  type TelegramStatus 
} from './api';

export function useTelegram() {
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [linkInfo, setLinkInfo] = useState<TelegramLinkInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getTelegramStatus();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch Telegram status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const generateLink = async () => {
    setError(null);

    try {
      const data = await generateTelegramLink();
      setLinkInfo(data);
      // Rafraîchir le statut après génération du lien
      await fetchStatus();
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate Telegram link');
      return null;
    }
  };

  const unlink = async () => {
    setError(null);

    try {
      await unlinkTelegram();
      setLinkInfo(null);
      await fetchStatus();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unlink Telegram');
      return false;
    }
  };

  const sendTest = async (message?: string) => {
    setError(null);

    try {
      const result = await sendTestMessage(message);
      return result.success;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send test message');
      return false;
    }
  };

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

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

