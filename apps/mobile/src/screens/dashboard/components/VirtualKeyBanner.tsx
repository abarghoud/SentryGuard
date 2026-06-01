import type { JSX } from 'react';
import { Pressable, Text, View } from 'react-native';

import { Vehicle } from '../../../features/vehicles/domain/entities';
import { TranslationFunction } from '../dashboard.helpers';
import { DashboardStyles } from '../dashboard.styles';

export function VirtualKeyBanner({
  message,
  onOpenKey,
  styles,
  t,
  vehicles,
}: {
  message: string | null;
  onOpenKey(): void;
  styles: DashboardStyles;
  t: TranslationFunction;
  vehicles: Vehicle[];
}): JSX.Element | null {
  if (vehicles.length === 0 || vehicles.some((vehicle) => vehicle.key_paired)) {
    return null;
  }

  return (
    <View style={styles.keyBanner}>
      <View style={styles.keyCopy}>
        <Text style={styles.keyTitle}>{t('dashboard.virtualKey.title')}</Text>
        <Text style={styles.keyText}>{t('dashboard.virtualKey.text')}</Text>
        {message ? <Text style={styles.keyMessage}>{message}</Text> : null}
      </View>
      <Pressable accessibilityRole="button" onPress={onOpenKey} style={styles.keyButton}>
        <Text style={styles.keyButtonText}>{t('dashboard.virtualKey.open')}</Text>
      </Pressable>
    </View>
  );
}
