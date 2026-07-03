import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

import { useHaptics } from '../../core/design/use-haptics';
import { setVehicleHiddenUseCase } from '../../features/vehicles/di';
import { VehicleActionResponse } from '../../features/vehicles/domain/entities';
import { resolveSuccessfulResponse } from './vehicle-detail.helpers';

export function useHideVehicle(vehicleId: string): UseMutationResult<VehicleActionResponse, Error, void> {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const haptics = useHaptics();

  return useMutation<VehicleActionResponse, Error, void>({
    mutationFn: async () => resolveSuccessfulResponse(await setVehicleHiddenUseCase.execute(vehicleId, true), t),
    onError: () => haptics.error(),
    onSuccess: () => {
      haptics.success();
      navigation.goBack();
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: ['hidden-vehicles'] });
    },
  });
}
