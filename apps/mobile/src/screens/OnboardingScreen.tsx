import type { JSX } from 'react';
import { Text } from 'react-native';

import { useThemeColors } from '../core/theme';
import { OnboardingFrame } from './onboarding/components/OnboardingFrame';
import { PrimaryButton } from './onboarding/components/PrimaryButton';
import { SecondaryButton } from './onboarding/components/SecondaryButton';
import { StepList } from './onboarding/components/StepList';
import { openVirtualKey, resolveError, resolveVehicleName } from './onboarding/onboarding.helpers';
import { createOnboardingStyles } from './onboarding/onboarding.styles';
import { useOnboarding } from './onboarding/use-onboarding';

interface OnboardingScreenProps {
  onComplete(): void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps): JSX.Element {
  const colors = useThemeColors();
  const styles = createOnboardingStyles(colors);
  const {
    acceptConsentMutation,
    completeMutation,
    consentStatusQuery,
    consentTextQuery,
    flags,
    message,
    onboardingQuery,
    sendTelegramTestMessage,
    setMessage,
    t,
    telegramLinkMutation,
    telegramQuery,
    telemetryMutation,
    telemetryVehicle,
    vehicles,
    vehiclesQuery,
  } = useOnboarding(onComplete);

  if (flags.isLoading) {
    return <OnboardingFrame styles={styles} title={t('onboarding.loadingTitle')} subtitle={t('onboarding.loadingSubtitle')} t={t} />;
  }

  if (onboardingQuery.data?.isComplete) {
    return (
      <OnboardingFrame
        styles={styles}
        title={t('onboarding.doneTitle')}
        subtitle={t('onboarding.doneSubtitle')}
        t={t}
        actions={<PrimaryButton label={t('onboarding.continue')} onPress={onComplete} styles={styles} />}
      />
    );
  }

  if (flags.isConsentMissing) {
    return (
      <OnboardingFrame
        styles={styles}
        title={t('onboarding.consentTitle')}
        subtitle={t('onboarding.consentSubtitle')}
        t={t}
        message={resolveError(consentStatusQuery.error) ?? message}
        actions={
          <PrimaryButton
            disabled={acceptConsentMutation.isPending || !consentTextQuery.data}
            label={acceptConsentMutation.isPending ? t('onboarding.accepting') : t('onboarding.accept')}
            onPress={() => {
              if (consentTextQuery.data) {
                acceptConsentMutation.mutate(consentTextQuery.data);
              }
            }}
            styles={styles}
          />
        }
      >
        <Text style={styles.legalText}>{consentTextQuery.data?.text ?? t('onboarding.consentUnavailable')}</Text>
      </OnboardingFrame>
    );
  }

  if (flags.isTelegramMissing) {
    return (
      <OnboardingFrame
        styles={styles}
        title="Telegram"
        subtitle={t('onboarding.telegramSubtitle')}
        t={t}
        message={resolveError(telegramQuery.error) ?? message}
        actions={
          <>
            <PrimaryButton
              disabled={telegramLinkMutation.isPending}
              label={telegramLinkMutation.isPending ? t('onboarding.telegramOpening') : t('onboarding.telegramOpen')}
              onPress={() => telegramLinkMutation.mutate()}
              styles={styles}
            />
            <SecondaryButton label={t('onboarding.telegramLinked')} onPress={() => void telegramQuery.refetch()} styles={styles} />
            <SecondaryButton label={t('onboarding.telegramTest')} onPress={sendTelegramTestMessage} styles={styles} />
          </>
        }
      >
        <StepList
          items={[t('onboarding.telegramStep1'), t('onboarding.telegramStep2'), t('onboarding.telegramStep3'), t('onboarding.telegramStep4')]}
          styles={styles}
        />
      </OnboardingFrame>
    );
  }

  if (flags.isVehicleMissing) {
    return (
      <OnboardingFrame
        styles={styles}
        title={t('onboarding.vehiclesTitle')}
        subtitle={t('onboarding.vehiclesSubtitle')}
        t={t}
        message={resolveError(vehiclesQuery.error)}
        actions={<SecondaryButton label={t('onboarding.refresh')} onPress={() => void vehiclesQuery.refetch()} styles={styles} />}
      >
        <StepList items={[t('onboarding.vehiclesStep1'), t('onboarding.vehiclesStep2'), t('onboarding.vehiclesStep3')]} styles={styles} />
      </OnboardingFrame>
    );
  }

  if (flags.isVirtualKeyMissing) {
    return (
      <OnboardingFrame
        styles={styles}
        title={t('onboarding.virtualKeyTitle')}
        subtitle={t('onboarding.virtualKeySubtitle')}
        t={t}
        message={message}
        actions={
          <>
            <PrimaryButton label={t('dashboard.virtualKey.open')} onPress={() => openVirtualKey(setMessage, t)} styles={styles} />
            <SecondaryButton label={t('onboarding.virtualKeyAdded')} onPress={() => void vehiclesQuery.refetch()} styles={styles} />
          </>
        }
      >
        <StepList
          items={[t('onboarding.virtualKeyStep1'), t('onboarding.virtualKeyStep2'), t('onboarding.virtualKeyStep3'), t('onboarding.virtualKeyStep4')]}
          styles={styles}
        />
      </OnboardingFrame>
    );
  }

  if (flags.isTelemetryMissing && telemetryVehicle) {
    return (
      <OnboardingFrame
        styles={styles}
        title={t('vehicle.alertSentry')}
        subtitle={t('onboarding.sentrySubtitle')}
        t={t}
        message={message}
        actions={
          <PrimaryButton
            disabled={telemetryMutation.isPending}
            label={telemetryMutation.isPending ? t('onboarding.activating') : t('onboarding.activateVehicle', { vehicle: resolveVehicleName(telemetryVehicle, t) })}
            onPress={() => telemetryMutation.mutate(telemetryVehicle.vin)}
            styles={styles}
          />
        }
      >
        <StepList
          items={vehicles.map((vehicle) =>
            t(vehicle.sentry_mode_monitoring_enabled ? 'onboarding.vehicleEnabled' : 'onboarding.vehicleDisabled', {
              vehicle: resolveVehicleName(vehicle, t),
            })
          )}
          styles={styles}
        />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      styles={styles}
      title={t('onboarding.readyTitle')}
      subtitle={t('onboarding.readySubtitle')}
      t={t}
      message={message}
      actions={
        <PrimaryButton
          disabled={completeMutation.isPending}
          label={completeMutation.isPending ? t('onboarding.finalizing') : t('onboarding.finish')}
          onPress={() => completeMutation.mutate()}
          styles={styles}
        />
      }
    />
  );
}
