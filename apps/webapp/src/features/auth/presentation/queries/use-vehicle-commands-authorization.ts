import { useQuery, useMutation } from '@tanstack/react-query';
import { ApiClient } from '../../../../core/api/api-client';

const apiClient = new ApiClient();

export function useVehicleCommandsAuthorization() {
  return useQuery({
    queryKey: ['auth', 'vehicle-commands-authorized'],
    queryFn: async () => {
      return apiClient.request<{ authorized: boolean }>('/auth/vehicle-commands-authorized');
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

export function useRequestVehicleCommandsScope() {
  return useMutation({
    mutationFn: async () => {
      return apiClient.request<{ url: string; state: string; message: string }>(
        '/auth/tesla/scope-change?missing=vehicle_cmds'
      );
    },
    onSuccess: (data) => {
      if (typeof window !== 'undefined') {
        window.location.href = data.url;
      }
    },
  });
}
