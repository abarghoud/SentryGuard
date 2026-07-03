import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { useThemeColors } from '../../../core/theme';
import { Icon } from '../../../core/ui';
import { useHideVehicle } from '../use-hide-vehicle';

export interface VehicleActionsMenuProps {
  vehicleId: string;
}

export function VehicleActionsMenu({ vehicleId }: VehicleActionsMenuProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { mutate: hideVehicle } = useHideVehicle(vehicleId);

  const onPress = (): void => {
    if (globalThis.confirm(t('vehicle.hideConfirm'))) {
      hideVehicle();
    }
  };

  return (
    <Pressable accessibilityLabel={t('vehicle.hide')} onPress={onPress} style={styles.button}>
      <Icon name="ellipsis" size={22} color={colors.label} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 36,
  },
});
