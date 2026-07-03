import { MenuView } from '@react-native-menu/menu';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import type { JSX } from 'react';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Platform, Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { radius, spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useThemeColors } from '../../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Icon, Surface } from '../../../core/ui';
import { useHideVehicle } from '../use-hide-vehicle';

export interface VehicleActionsMenuProps {
  vehicleId: string;
}

// Expo Go cannot load third-party native views (MenuView would throw
// "View config not found"), so we only render the native menu in real builds.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export function VehicleActionsMenu({ vehicleId }: VehicleActionsMenuProps): JSX.Element {
  return isExpoGo ? <FallbackActionsMenu vehicleId={vehicleId} /> : <NativeActionsMenu vehicleId={vehicleId} />;
}

function NativeActionsMenu({ vehicleId }: VehicleActionsMenuProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const { mutate: hideVehicle } = useHideVehicle(vehicleId);

  const confirmHide = useCallback(() => {
    Alert.alert(t('vehicle.hideTitle'), t('vehicle.hideConfirm'), [
      { style: 'cancel', text: t('vehicle.cancel') },
      { onPress: () => hideVehicle(), style: 'destructive', text: t('vehicle.hideCta') },
    ]);
  }, [hideVehicle, t]);

  return (
    <MenuView
      shouldOpenOnLongPress={false}
      onPressAction={({ nativeEvent }) => {
        if (nativeEvent.event === 'hide') {
          confirmHide();
        }
      }}
      actions={[
        {
          attributes: { destructive: true },
          id: 'hide',
          image: Platform.select({ ios: 'eye.slash' }),
          title: t('vehicle.hide'),
        },
      ]}
    >
      <View style={styles.button}>
        <Icon name="ellipsis" size={22} color={colors.label} />
      </View>
    </MenuView>
  );
}

const headerHeight = Platform.OS === 'ios' ? 44 : 56;

function FallbackActionsMenu({ vehicleId }: VehicleActionsMenuProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const insets = useSafeAreaInsets();
  const buttonRef = useRef<View>(null);
  const { mutate: hideVehicle } = useHideVehicle(vehicleId);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [menuTop, setMenuTop] = useState<number | null>(null);

  const close = useCallback(() => {
    setIsMenuOpen(false);
    setIsConfirming(false);
  }, []);

  const confirmHide = useCallback(() => {
    close();
    hideVehicle();
  }, [close, hideVehicle]);

  const openMenu = useCallback(() => {
    const fallbackTop = insets.top + headerHeight + spacing.xs;
    if (!buttonRef.current) {
      setMenuTop(fallbackTop);
      setIsMenuOpen(true);
      return;
    }

    buttonRef.current.measureInWindow((_x, y, _width, height) => {
      setMenuTop(Number.isFinite(y) ? y + height + spacing.xs : fallbackTop);
      setIsMenuOpen(true);
    });
  }, [insets.top]);

  return (
    <>
      <Pressable ref={buttonRef} accessibilityLabel={t('vehicle.hide')} hitSlop={12} style={styles.button} onPress={openMenu}>
        <Icon name="ellipsis" size={22} color={colors.label} />
      </Pressable>

      <Modal transparent visible={isMenuOpen} animationType="fade" onRequestClose={close}>
        {isConfirming ? (
          <View style={[styles.confirmBackdrop, { backgroundColor: colors.overlay }]}>
            <Surface style={styles.confirmCard}>
              <AppText variant={TextVariant.Title3}>{t('vehicle.hideTitle')}</AppText>
              <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
                {t('vehicle.hideConfirm')}
              </AppText>
              <GlassButton label={t('vehicle.hideCta')} destructive onPress={confirmHide} />
              <GlassButton label={t('vehicle.cancel')} variant={GlassButtonVariant.Secondary} onPress={close} />
            </Surface>
          </View>
        ) : (
          <Pressable style={styles.menuBackdrop} onPress={close}>
            <View
              style={[
                styles.menu,
                styles.menuElevated,
                {
                  top: menuTop ?? insets.top + headerHeight + spacing.xs,
                  backgroundColor: colors.secondarySystemGroupedBackground,
                  borderColor: colors.separator,
                },
              ]}
            >
              <Pressable style={styles.item} onPress={() => setIsConfirming(true)}>
                <Icon name="eye.slash" size={20} color={colors.label} />
                <AppText variant={TextVariant.Body} style={styles.itemLabel}>
                  {t('vehicle.hide')}
                </AppText>
              </Pressable>
            </View>
          </Pressable>
        )}
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    height: 22,
    justifyContent: 'center',
    width: 36,
  },
  confirmBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  confirmCard: {
    gap: spacing.md,
    maxWidth: 360,
    width: '100%',
  },
  item: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  itemLabel: {
    flexShrink: 1,
  },
  menu: {
    borderRadius: radius.control,
    borderWidth: StyleSheet.hairlineWidth,
    maxWidth: 320,
    position: 'absolute',
    right: spacing.md,
    width: '86%',
  },
  menuElevated: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOffset: { height: 8, width: 0 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    default: {
      elevation: 4,
    },
  }) as ViewStyle,
  menuBackdrop: {
    flex: 1,
  },
});
