import type { JSX } from 'react';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { TextVariant } from '../design/typography';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';
import { Icon } from './Icon';

interface VinMaskProps {
  vin: string;
  color?: string;
  style?: StyleProp<ViewStyle>;
  variant?: TextVariant;
}

export function maskVin(vin: string): string {
  return vin.length >= 3 ? `${vin.slice(0, 3)}••••••••••••••` : vin;
}

export function VinMask({
  vin,
  color,
  style,
  variant = TextVariant.Footnote,
}: VinMaskProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = useCallback(() => {
    setIsVisible((prev) => !prev);
  }, []);

  const maskedVin = maskVin(vin);

  return (
    <View style={[styles.container, style]}>
      <AppText
        variant={variant}
        style={[
          styles.vinText,
          { color: color ?? colors.secondaryLabel },
        ]}
        numberOfLines={1}
      >
        {isVisible ? vin : maskedVin}
      </AppText>
      <Pressable
        accessibilityLabel={isVisible ? t('vehicle.hideVin') : t('vehicle.showVin')}
        accessibilityRole="button"
        hitSlop={8}
        onPress={toggleVisibility}
        style={({ pressed }) => [
          styles.button,
          pressed && { opacity: 0.6 },
        ]}
      >
        <Icon name={isVisible ? 'eye.slash' : 'eye'} size={14} color={colors.secondaryLabel} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  vinText: {
    fontFamily: Platform.select({
      ios: 'Courier',
      android: 'monospace',
      default: 'monospace',
    }),
  },
});
