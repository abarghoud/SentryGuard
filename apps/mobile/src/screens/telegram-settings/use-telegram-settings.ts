import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import { useEffect, useState } from 'react';

import { useTelegramStatusSync } from '../../core/hooks/useTelegramStatusSync';
import {
  generateTelegramLinkUseCase,
  getTelegramStatusUseCase,
  sendTelegramTestMessageUseCase,
  unlinkTelegramUseCase,
} from '../../features/telegram/di';
import { TelegramActionResponse, TelegramLinkInfo } from '@sentryguard/telegram-domain';

export function useTelegramSettings() {
  const queryClient = useQueryClient();
  const [isAwaitingTelegramReturn, setIsAwaitingTelegramReturn] = useState(false);
  const [telegramLinkInfo, setTelegramLinkInfo] = useState<TelegramLinkInfo | null>(null);
  useTelegramStatusSync();

  const telegramStatusQuery = useQuery({
    queryFn: () => getTelegramStatusUseCase.execute(),
    queryKey: ['telegram-status'],
  });
  const isTelegramLinked = telegramStatusQuery.data?.linked === true;

  useEffect(() => {
    if (isTelegramLinked) {
      setIsAwaitingTelegramReturn(false);
    }
  }, [isTelegramLinked]);

  const telegramLinkMutation = useMutation<TelegramLinkInfo, Error>({
    mutationFn: () => generateTelegramLinkUseCase.execute(),
    onSuccess: async (linkInfo) => {
      setTelegramLinkInfo(linkInfo);
      await queryClient.invalidateQueries({ queryKey: ['telegram-status'] });
      await Linking.openURL(linkInfo.link);
      setIsAwaitingTelegramReturn(true);
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
    isAwaitingTelegramReturn,
    isTelegramLinked,
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
