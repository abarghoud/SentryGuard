import type { JSX } from 'react';

import { TextVariant } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText } from '../core/ui';
import { OnboardingFrame } from './onboarding/components/OnboardingFrame';
import { PrimaryButton } from './onboarding/components/PrimaryButton';
import { SecondaryButton } from './onboarding/components/SecondaryButton';
import { StepList } from './onboarding/components/StepList';
import { openVirtualKey, resolveError, resolveVehicleName } from './onboarding/onboarding.helpers';
import { useOnboarding } from './onboarding/use-onboarding';

interface OnboardingScreenProps {
  onComplete(): void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps): JSX.Element {
  const colors = useThemeColors();
  const {
    acceptConsentMutation,
    completeMutation,
    consentStatusQuery,
    consentTextQuery,
    flags,
    message,
    onboardingQuery,
    setMessage,
    t,
    telemetryMutation,
    telemetryVehicle,
    vehicles,
    vehiclesQuery,
  } = useOnboarding(onComplete);

  if (flags.isLoading) {
    return <OnboardingFrame title={t('onboarding.loadingTitle')} subtitle={t('onboarding.loadingSubtitle')} t={t} />;
  }

  if (onboardingQuery.data?.isComplete) {
    return (
      <OnboardingFrame
        title={t('onboarding.doneTitle')}
        subtitle={t('onboarding.doneSubtitle')}
        t={t}
        actions={<PrimaryButton label={t('onboarding.continue')} onPress={onComplete} />}
      />
    );
  }

  if (flags.isConsentMissing) {
    return (
      <OnboardingFrame
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
          />
        }
      >
        <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
          {consentTextQuery.data?.text ?? t('onboarding.consentUnavailable')}
        </AppText>
      </OnboardingFrame>
    );
  }

  if (flags.isVehicleMissing) {
    return (
      <OnboardingFrame
        title={t('onboarding.vehiclesTitle')}
        subtitle={t('onboarding.vehiclesSubtitle')}
        t={t}
        message={resolveError(vehiclesQuery.error)}
        actions={<SecondaryButton label={t('onboarding.refresh')} onPress={() => void vehiclesQuery.refetch()} />}
      >
        <StepList items={[t('onboarding.vehiclesStep1'), t('onboarding.vehiclesStep2'), t('onboarding.vehiclesStep3')]} />
      </OnboardingFrame>
    );
  }

  if (flags.isVirtualKeyMissing) {
    return (
      <OnboardingFrame
        title={t('onboarding.virtualKeyTitle')}
        subtitle={t('onboarding.virtualKeySubtitle')}
        t={t}
        message={message}
        actions={
          <>
            <PrimaryButton label={t('dashboard.virtualKey.open')} onPress={() => openVirtualKey(setMessage, t)} />
            <SecondaryButton label={t('onboarding.virtualKeyAdded')} onPress={() => void vehiclesQuery.refetch()} />
          </>
        }
      >
        <StepList
          items={[t('onboarding.virtualKeyStep1'), t('onboarding.virtualKeyStep2'), t('onboarding.virtualKeyStep3'), t('onboarding.virtualKeyStep4')]}
        />
      </OnboardingFrame>
    );
  }

  if (flags.isTelemetryMissing && telemetryVehicle) {
    return (
      <OnboardingFrame
        title={t('vehicle.alertSentry')}
        subtitle={t('onboarding.sentrySubtitle')}
        t={t}
        message={message}
        actions={
          <PrimaryButton
            disabled={telemetryMutation.isPending}
            label={telemetryMutation.isPending ? t('onboarding.activating') : t('onboarding.activateVehicle', { vehicle: resolveVehicleName(telemetryVehicle, t) })}
            onPress={() => telemetryMutation.mutate(telemetryVehicle.vin)}
          />
        }
      >
        <StepList
          items={vehicles.map((vehicle) =>
            t(vehicle.sentry_mode_monitoring_enabled ? 'onboarding.vehicleEnabled' : 'onboarding.vehicleDisabled', {
              vehicle: resolveVehicleName(vehicle, t),
            })
          )}
        />
      </OnboardingFrame>
    );
  }

  return (
    <OnboardingFrame
      title={t('onboarding.readyTitle')}
      subtitle={t('onboarding.readySubtitle')}
      t={t}
      message={message}
      actions={
        <PrimaryButton
          disabled={completeMutation.isPending}
          label={completeMutation.isPending ? t('onboarding.finalizing') : t('onboarding.finish')}
          onPress={() => completeMutation.mutate()}
        />
      }
    />
  );
}
