import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthStatus, UserProfile } from '../../domain/entities';
import { ApiError } from '../../../../core/api/api-client';
import { getToken, clearToken } from '../../../../core/api/token-manager';
import {
  CheckAuthStatusRequirements,
  GetUserProfileRequirements,
  LogoutRequirements,
} from '../../domain/use-cases/auth.use-cases.requirements';

export interface AuthQueryDependencies {
  checkAuthStatusUseCase: CheckAuthStatusRequirements;
  getUserProfileUseCase: GetUserProfileRequirements;
  logoutUseCase: LogoutRequirements;
}

export const createUseAuthQuery = (deps: AuthQueryDependencies) => () => {
  const queryClient = useQueryClient();

  const authQuery = useQuery<{ status: AuthStatus; profile: UserProfile | null }, Error>({
    queryKey: ['auth'],
    queryFn: async () => {
      const token = getToken();
      if (!token) {
        return {
          status: { authenticated: false, userId: '', message: 'No token' },
          profile: null,
        };
      }

      try {
        const status = await deps.checkAuthStatusUseCase.execute();
        let profile: UserProfile | null = null;
        if (status.authenticated) {
          profile = await deps.getUserProfileUseCase.execute();
        }
        return { status, profile };
      } catch (err) {
        if (err instanceof ApiError && err.status === 401) {
          clearToken();
        }
        throw err;
      }
    },
    retry: false,
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await deps.logoutUseCase.execute();
    },
    onSettled: () => {
      clearToken();
      queryClient.setQueryData(['auth'], {
        status: { authenticated: false, userId: '', message: 'Logged out' },
        profile: null,
      });
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
    },
  });

  return {
    query: authQuery,
    logoutMutation,
  };
};
