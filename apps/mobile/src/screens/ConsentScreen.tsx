import type { JSX } from 'react';
import { StyleSheet } from 'react-native';

import { TextVariant } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText } from '../core/ui';
import { useConsentGate } from './consent/use-consent-gate';
import { OnboardingFrame } from './onboarding/components/OnboardingFrame';
import { PrimaryButton } from './onboarding/components/PrimaryButton';
import { SecondaryButton } from './onboarding/components/SecondaryButton';
import { resolveError } from './onboarding/onboarding.helpers';

interface ConsentScreenProps {
  onLogout(): Promise<void>;
}

export function ConsentScreen({ onLogout }: ConsentScreenProps): JSX.Element {
  const colors = useThemeColors();
  const { acceptConsentMutation, consentTextQuery, t } = useConsentGate();

  return (
    <OnboardingFrame
      kicker={t('consentGate.kicker')}
      title={t('consentGate.title')}
      subtitle={t('consentGate.subtitle')}
      t={t}
      message={resolveError(acceptConsentMutation.error) ?? resolveError(consentTextQuery.error)}
      actions={
        <>
          <PrimaryButton
            disabled={acceptConsentMutation.isPending || !consentTextQuery.data}
            label={acceptConsentMutation.isPending ? t('onboarding.accepting') : t('onboarding.accept')}
            onPress={() => {
              if (consentTextQuery.data) {
                acceptConsentMutation.mutate(consentTextQuery.data);
              }
            }}
          />
          <SecondaryButton label={t('settings.logout')} onPress={() => void onLogout()} />
        </>
      }
    >
      <AppText android_hyphenationFrequency="full" variant={TextVariant.Footnote} color={colors.secondaryLabel} style={styles.paragraph}>
        {consentTextQuery.data?.text ?? t('onboarding.consentUnavailable')}
      </AppText>
    </OnboardingFrame>
  );
}

const styles = StyleSheet.create({
  paragraph: {
    textAlign: 'justify',
  },
});
