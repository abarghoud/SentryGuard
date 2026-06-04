import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { OnboardingStatus } from '../../domain/entities';
import { hasToken } from '../../../../core/api/token-manager';
import {
  GetOnboardingStatusRequirements,
  CompleteOnboardingRequirements,
  SkipOnboardingRequirements,
  DismissAnnouncementRequirements,
} from '../../domain/use-cases/onboarding.use-cases.requirements';

export interface OnboardingQueryDependencies {
  getOnboardingStatusUseCase: GetOnboardingStatusRequirements;
  completeOnboardingUseCase: CompleteOnboardingRequirements;
  skipOnboardingUseCase: SkipOnboardingRequirements;
  dismissAnnouncementUseCase: DismissAnnouncementRequirements;
}

export const createUseOnboardingQuery = (deps: OnboardingQueryDependencies) => () => {
  const queryClient = useQueryClient();

  const query = useQuery<OnboardingStatus | null, Error>({
    queryKey: ['onboarding', 'status'],
    queryFn: async () => {
      if (!hasToken()) {
        return null;
      }
      return deps.getOnboardingStatusUseCase.execute();
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const result = await deps.completeOnboardingUseCase.execute();
      if (!result.success) throw new Error('Failed to complete onboarding');
      return result;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['onboarding', 'status'] });
    },
  });

  const skipOnboardingMutation = useMutation({
    mutationFn: async () => {
      const result = await deps.skipOnboardingUseCase.execute();
      if (!result.success) throw new Error('Failed to skip onboarding');
      return result;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['onboarding', 'status'] });
    },
  });

  const dismissAnnouncementMutation = useMutation({
    mutationFn: async (key: string) => {
      const result = await deps.dismissAnnouncementUseCase.execute(key);
      if (!result.success) throw new Error('Failed to dismiss announcement');
      return result;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['onboarding', 'status'] });
    },
  });

  return {
    query,
    completeOnboardingMutation,
    skipOnboardingMutation,
    dismissAnnouncementMutation,
  };
};
