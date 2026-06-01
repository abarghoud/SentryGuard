import type { JSX } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { VehicleDetailStyles } from '../vehicle-detail.styles';

export function BetaBadge({ styles }: { styles: VehicleDetailStyles }): JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.betaBadge}>
      <Text style={styles.betaBadgeText}>{t('common.beta')}</Text>
    </View>
  );
}
