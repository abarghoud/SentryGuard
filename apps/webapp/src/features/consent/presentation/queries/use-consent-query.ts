import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ConsentStatus,
  ConsentAcceptRequest,
} from '../../domain/entities';
import {
  GetConsentStatusRequirements,
  GetConsentTextRequirements,
  AcceptConsentRequirements,
  RevokeConsentRequirements,
} from '../../domain/use-cases/consent.use-cases.requirements';

export interface ConsentQueryDependencies {
  getConsentStatusUseCase: GetConsentStatusRequirements;
  getConsentTextUseCase: GetConsentTextRequirements;
  acceptConsentUseCase: AcceptConsentRequirements;
  revokeConsentUseCase: RevokeConsentRequirements;
}

export const createUseConsentQuery = (deps: ConsentQueryDependencies) => () => {
  const queryClient = useQueryClient();

  const query = useQuery<ConsentStatus, Error>({
    queryKey: ['consent', 'status'],
    queryFn: async () => {
      return deps.getConsentStatusUseCase.execute();
    },
  });

  const acceptConsentMutation = useMutation({
    mutationFn: async (consentData: ConsentAcceptRequest) => {
      const result = await deps.acceptConsentUseCase.execute(consentData);
      if (!result.success) throw new Error('Failed to accept consent');
      return result;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['consent', 'status'] });
    },
  });

  const revokeConsentMutation = useMutation({
    mutationFn: async () => {
      const result = await deps.revokeConsentUseCase.execute();
      if (!result.success) throw new Error('Failed to revoke consent');
      return result;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['consent', 'status'] });
    },
  });

  return {
    query,
    acceptConsentMutation,
    revokeConsentMutation,
  };
};
