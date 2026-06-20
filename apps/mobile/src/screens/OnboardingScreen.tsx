import { useState } from 'react';
import type { JSX } from 'react';
import { StyleSheet } from 'react-native';

import { TextVariant } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText, SegmentedControl } from '../core/ui';
import { OffensiveResponse } from '../features/vehicles/domain/entities';
import { OnboardingFrame } from './onboarding/components/OnboardingFrame';
import { PrimaryButton } from './onboarding/components/PrimaryButton';
import { SecondaryButton } from './onboarding/components/SecondaryButton';
import { StepList } from './onboarding/components/StepList';
import { NotificationStep } from './onboarding/components/NotificationStep';
import { openVirtualKey, resolveError, resolveVehicleName } from './onboarding/onboarding.helpers';
import { useOnboarding } from './onboarding/use-onboarding';

interface OnboardingScreenProps {
  onComplete(): void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps): JSX.Element {
  const colors = useThemeColors();
  const [hasConfirmedNotifications, setHasConfirmedNotifications] = useState(false);
  const [hasReviewedBreakIn, setHasReviewedBreakIn] = useState(false);
  const [hasReviewedOffensive, setHasReviewedOffensive] = useState(false);
  const {
    acceptConsentMutation,
    completeMutation,
    consentStatusQuery,
    consentTextQuery,
    enablePush,
    flags,
    isPushActive,
    isTelegramLinked,
    message,
    monitoredVehicle,
    offensiveResponseMutation,
    onboardingQuery,
    scopeMutation,
    setMessage,
    skipMutation,
    t,
    telemetryMutation,
    telemetryVehicle,
    toggleBreakInMutation,
    vehicleCommandsAuthorized,
    vehicles,
    vehiclesQuery,
  } = useOnboarding(onComplete);

  const skipSetup = (): void => skipMutation.mutate();

  if (flags.isLoading) {
    return <OnboardingFrame title={t('onboarding.loadingTitle')} subtitle={t('onboarding.loadingSubtitle')} t={t} />;
  }

  if (onboardingQuery.data?.isComplete && !onboardingQuery.data?.isSkipped) {
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
        <AppText android_hyphenationFrequency="full" variant={TextVariant.Footnote} color={colors.secondaryLabel} style={styles.paragraph}>
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
        onSkip={skipSetup}
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
        onSkip={skipSetup}
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
        onSkip={skipSetup}
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

  if (monitoredVehicle && !monitoredVehicle.break_in_monitoring_enabled && !hasReviewedBreakIn) {
    return (
      <OnboardingFrame
        title={t('onboarding.breakInTitle')}
        subtitle={t('onboarding.breakInSubtitle')}
        t={t}
        message={message}
        actions={
          <>
            <PrimaryButton
              disabled={toggleBreakInMutation.isPending}
              label={toggleBreakInMutation.isPending ? t('onboarding.activating') : t('onboarding.breakInActivate')}
              onPress={() => toggleBreakInMutation.mutate(monitoredVehicle.vin, { onSuccess: () => setHasReviewedBreakIn(true) })}
            />
            <SecondaryButton label={t('onboarding.skip')} onPress={() => setHasReviewedBreakIn(true)} />
          </>
        }
      />
    );
  }

  if (monitoredVehicle && monitoredVehicle.break_in_monitoring_enabled && !hasReviewedOffensive) {
    if (!vehicleCommandsAuthorized) {
      return (
        <OnboardingFrame
          title={t('onboarding.offensiveTitle')}
          subtitle={t('vehicle.scopeDescription')}
          t={t}
          message={message}
          actions={
            <>
              <PrimaryButton
                disabled={scopeMutation.isPending}
                label={scopeMutation.isPending ? t('vehicle.openingTesla') : t('vehicle.authorizeOffensive')}
                onPress={() => scopeMutation.mutate()}
              />
              <SecondaryButton label={t('onboarding.skip')} onPress={() => setHasReviewedOffensive(true)} />
            </>
          }
        />
      );
    }

    return (
      <OnboardingFrame
        title={t('onboarding.offensiveTitle')}
        subtitle={t('onboarding.offensiveSubtitle')}
        t={t}
        message={message}
        actions={<PrimaryButton label={t('onboarding.continue')} onPress={() => setHasReviewedOffensive(true)} />}
      >
        <SegmentedControl
          value={(monitoredVehicle.break_in_offensive_response as OffensiveResponse) ?? OffensiveResponse.Disabled}
          onChange={(value) => offensiveResponseMutation.mutate({ vin: monitoredVehicle.vin, response: value })}
          options={[
            { label: t('vehicle.offensiveDisabled'), value: OffensiveResponse.Disabled },
            { label: t('vehicle.offensiveHonk'), value: OffensiveResponse.Honk },
            { label: t('vehicle.offensiveFart'), value: OffensiveResponse.Fart },
          ]}
        />
      </OnboardingFrame>
    );
  }

  if (flags.isNotificationConfigMissing || !hasConfirmedNotifications) {
    return (
      <OnboardingFrame
        title={t('onboarding.notificationsTitle')}
        subtitle={t('onboarding.notificationsSubtitle')}
        t={t}
        onSkip={skipSetup}
        message={message}
        actions={
          flags.isNotificationConfigMissing ? (
            <PrimaryButton
              label={t('onboarding.notificationsActivatePush')}
              onPress={enablePush}
            />
          ) : (
            <PrimaryButton
              label={t('onboarding.continue')}
              onPress={() => setHasConfirmedNotifications(true)}
            />
          )
        }
      >
        <NotificationStep
          isPushActive={isPushActive}
          isTelegramLinked={isTelegramLinked}
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

const styles = StyleSheet.create({
  paragraph: {
    textAlign: 'justify',
  },
});
