import type { JSX } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TranslationFunction } from '../onboarding.helpers';
import { OnboardingStyles } from '../onboarding.styles';

export function OnboardingFrame({
  actions,
  children,
  message,
  styles,
  subtitle,
  t,
  title,
}: {
  actions?: JSX.Element;
  children?: JSX.Element;
  message?: string | null;
  styles: OnboardingStyles;
  subtitle: string;
  t: TranslationFunction;
  title: string;
}): JSX.Element {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.kicker}>{t('onboarding.kicker')}</Text>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
        </View>
        {children ? <View style={styles.panel}>{children}</View> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}
