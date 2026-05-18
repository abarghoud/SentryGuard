import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiClient } from '../../../../core/api/api-client';
import { TeslaScopes } from '@sentryguard/beta-domain';

const apiClient = new ApiClient();

export function useVehicleCommandsAuthorization() {
  return useQuery({
    queryKey: ['auth', 'vehicle-commands-authorized'],
    queryFn: async () => {
      return apiClient.request<{ authorized: boolean }>('/auth/vehicle-commands-authorized');
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useRequestVehicleCommandsScope() {
  return useMutation({
    mutationFn: async () => {
      return apiClient.request<{ url: string; state: string; message: string }>(
        `/auth/tesla/scope-change?missing=${TeslaScopes.VEHICLE_CMDS}`
      );
    },
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        window.location.href = data.url;
      }
    },
  });
}
