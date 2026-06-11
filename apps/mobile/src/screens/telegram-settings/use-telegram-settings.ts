import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTelegramStatusSync } from '../../core/hooks/useTelegramStatusSync';
import {
  generateTelegramLinkUseCase,
  getTelegramStatusUseCase,
  sendTelegramTestMessageUseCase,
  unlinkTelegramUseCase,
} from '../../features/telegram/di';
import { TelegramActionResponse, TelegramLinkInfo } from '@sentryguard/telegram-domain';

export function useTelegramSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [telegramLinkInfo, setTelegramLinkInfo] = useState<TelegramLinkInfo | null>(null);
  useTelegramStatusSync();

  const telegramStatusQuery = useQuery({
    queryFn: () => getTelegramStatusUseCase.execute(),
    queryKey: ['telegram-status'],
  });

  const telegramLinkMutation = useMutation<TelegramLinkInfo, Error>({
    mutationFn: () => generateTelegramLinkUseCase.execute(),
    onSuccess: async (linkInfo) => {
      setTelegramLinkInfo(linkInfo);
      await queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
      await Linking.openURL(linkInfo.link);
      setMessage(t('settings.telegramLinkReturn'));
    },
  });

  const unlinkTelegramMutation = useMutation<TelegramActionResponse, Error>({
    mutationFn: () => unlinkTelegramUseCase.execute(),
    onSuccess: async () => {
      setTelegramLinkInfo(null);
      await queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
    },
  });

  const sendTelegramTestMessageMutation = useMutation<TelegramActionResponse, Error>({
    mutationFn: () => sendTelegramTestMessageUseCase.execute(),
  });

  return {
    generateTelegramLink: async () => {
      return telegramLinkMutation.mutateAsync();
    },
    message,
    refreshTelegramStatus: async () => {
      await telegramStatusQuery.refetch();
    },
    sendTelegramTest: async () => {
      const result = await sendTelegramTestMessageMutation.mutateAsync();
      return result.success;
    },
    telegramLinkInfo,
    telegramStatus: telegramStatusQuery.data ?? null,
    unlinkTelegram: async () => {
      await unlinkTelegramMutation.mutateAsync();
      return true;
    },
  };
}
