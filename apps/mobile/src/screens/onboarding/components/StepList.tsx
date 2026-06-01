import type { JSX } from 'react';
import { Text, View } from 'react-native';

import { OnboardingStyles } from '../onboarding.styles';

export function StepList({ items, styles }: { items: string[]; styles: OnboardingStyles }): JSX.Element {
  return (
    <View style={styles.steps}>
      {items.map((item, index) => (
        <View key={item} style={styles.stepRow}>
          <Text style={styles.stepNumber}>{index + 1}</Text>
          <Text style={styles.stepText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
