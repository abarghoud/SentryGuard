import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TelegramStatus, TelegramLinkInfo } from '../../domain/entities';
import {
  GenerateTelegramLinkRequirements,
  GetTelegramStatusRequirements,
  UnlinkTelegramRequirements,
  SendTestMessageRequirements,
} from '../../domain/use-cases/telegram.use-cases.requirements';
import { hasToken } from '../../../../core/api/token-manager';
import { useState, useCallback, useEffect } from 'react';

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
    const expiresAt = parsed.expires_at ? new Date(parsed.expires_at).getTime() : 0;

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

export interface TelegramQueryDependencies {
  getTelegramStatusUseCase: GetTelegramStatusRequirements;
  generateTelegramLinkUseCase: GenerateTelegramLinkRequirements;
  unlinkTelegramUseCase: UnlinkTelegramRequirements;
  sendTestMessageUseCase: SendTestMessageRequirements;
}

export const createUseTelegramQuery = (deps: TelegramQueryDependencies) => () => {
  const queryClient = useQueryClient();

  const [linkInfo, setLinkInfo] = useState<TelegramLinkInfo | null>(null);

  const hydrateLinkInfo = useCallback(() => {
    setLinkInfo(readStoredLinkInfo());
  }, []);

  useEffect(() => {
    hydrateLinkInfo();
  }, [hydrateLinkInfo]);

  const query = useQuery<TelegramStatus | null, Error>({
    queryKey: ['telegram', 'status'],
    queryFn: async () => {
      if (!hasToken()) {
        clearStoredLinkInfo();
        setLinkInfo(null);
        return null;
      }
      const data = await deps.getTelegramStatusUseCase.execute();

      if (data.status === 'pending') {
        hydrateLinkInfo();
      } else {
        clearStoredLinkInfo();
        setLinkInfo(null);
      }

      return data;
    },
  });

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const data = await deps.generateTelegramLinkUseCase.execute();
      persistLinkInfo(data);
      setLinkInfo(data);
      return data;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['telegram', 'status'] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: async () => {
      await deps.unlinkTelegramUseCase.execute();
      clearStoredLinkInfo();
      setLinkInfo(null);
      return true;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['telegram', 'status'] });
    },
  });

  const sendTestMutation = useMutation({
    mutationFn: async () => {
      const result = await deps.sendTestMessageUseCase.execute();
      if (!result.success) throw new Error('Failed to send test message');
      return true;
    },
  });

  return {
    query,
    generateLinkMutation,
    unlinkMutation,
    sendTestMutation,
    linkInfo,
  };
};
