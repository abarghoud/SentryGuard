import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserLanguage } from '../../domain/entities';
import {
  GetUserLanguageRequirements,
  UpdateUserLanguageRequirements,
} from '../../domain/use-cases/user.use-cases.requirements';

export interface UserQueryDependencies {
  getUserLanguageUseCase: GetUserLanguageRequirements;
  updateUserLanguageUseCase: UpdateUserLanguageRequirements;
}

export const createUseUserQuery = (deps: UserQueryDependencies) => () => {
  const queryClient = useQueryClient();

  const languageQuery = useQuery<UserLanguage, Error>({
    queryKey: ['user', 'language'],
    queryFn: async () => {
      return deps.getUserLanguageUseCase.execute();
    },
  });

  const updateLanguageMutation = useMutation({
    mutationFn: async (language: 'en' | 'fr') => {
      const result = await deps.updateUserLanguageUseCase.execute(language);
      if (!result.success) throw new Error('Failed to update language');
      return result;
    },
    onSuccess: () => {
      return queryClient.invalidateQueries({ queryKey: ['user', 'language'] });
    },
  });

  return {
    languageQuery,
    updateLanguageMutation,
  };
};
