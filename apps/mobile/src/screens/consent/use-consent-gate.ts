import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { resolveSupportedLanguage } from '../../core/i18n';
import { acceptConsentUseCase, getConsentTextUseCase } from '../../features/consent/di';

export function useConsentGate() {
  const { i18n, t } = useTranslation();
  const queryClient = useQueryClient();
  const language = resolveSupportedLanguage(i18n.language);

  const consentTextQuery = useQuery({
    queryFn: () => getConsentTextUseCase.execute(language),
    queryKey: ['consent-text', language],
  });

  const acceptConsentMutation = useMutation({
    mutationFn: acceptConsentUseCase.execute.bind(acceptConsentUseCase),
    onSuccess: async () => {
      await queryClient.invalidateQueries();
    },
  });

  return { acceptConsentMutation, consentTextQuery, t };
}
