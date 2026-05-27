import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useState } from 'react';

import { ThemeColors, useThemeColors } from '../core/theme';
import { acceptConsent, getConsentStatus, getConsentText } from '../services/api/consent-api';
import { completeOnboarding, getOnboardingStatus, skipOnboarding } from '../services/api/onboarding-api';
import { generateTelegramLink, getTelegramStatus, sendTelegramTestMessage } from '../services/api/telegram-api';
import { getUserLanguage, UserLanguage } from '../services/api/user-language-api';
import { configureTelemetry, getVehicles, type Vehicle } from '../services/api/vehicles-api';
import { resolveVirtualKeyUrl } from '../services/api/virtual-key';

interface OnboardingScreenProps {
  onComplete(): void;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const styles = createStyles(colors);
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const languageQuery = useQuery({ queryFn: getUserLanguage, queryKey: ['user-language'] });
  const selectedLanguage = languageQuery.data?.language ?? UserLanguage.French;
  const consentStatusQuery = useQuery({ queryFn: getConsentStatus, queryKey: ['consent-status'] });
  const consentTextQuery = useQuery({ queryFn: () => getConsentText(selectedLanguage), queryKey: ['consent-text', selectedLanguage] });
  const onboardingQuery = useQuery({ queryFn: getOnboardingStatus, queryKey: ['onboarding-status'] });
  const telegramQuery = useQuery({
    enabled: consentStatusQuery.data?.hasConsent === true,
    queryFn: getTelegramStatus,
    queryKey: ['telegram-status'],
  });
  const vehiclesQuery = useQuery({
    enabled: consentStatusQuery.data?.hasConsent === true,
    queryFn: getVehicles,
    queryKey: ['vehicles'],
  });
  const acceptConsentMutation = useMutation({
    mutationFn: acceptConsent,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['consent-status'] });
      setMessage(null);
    },
  });
  const telegramLinkMutation = useMutation({
    mutationFn: generateTelegramLink,
    onSuccess: async (linkInfo) => {
      await Linking.openURL(linkInfo.link);
      setMessage(t('onboarding.telegramReturn'));
    },
  });
  const telemetryMutation = useMutation({
    mutationFn: (vin: string) => configureTelemetry(vin),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['vehicles'] });
      setMessage(null);
    },
    onError: (error: Error) => setMessage(error.message),
  });
  const completeMutation = useMutation({
    mutationFn: completeOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      onComplete();
    },
    onError: (error: Error) => setMessage(error.message),
  });
  useMutation({
    mutationFn: skipOnboarding,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['onboarding-status'] });
      onComplete();
    },
  });
  const vehicles = vehiclesQuery.data ?? [];
  const isLoading = consentStatusQuery.isLoading || onboardingQuery.isLoading || consentTextQuery.isLoading;
  const isConsentMissing = consentStatusQuery.data?.hasConsent !== true;
  const isTelegramMissing = telegramQuery.data?.linked !== true;
  const isVehicleMissing = vehicles.length === 0;
  const isVirtualKeyMissing = vehicles.length > 0 && !vehicles.some((vehicle) => vehicle.key_paired);
  const telemetryVehicle = vehicles.find((vehicle) => !vehicle.sentry_mode_monitoring_enabled) ?? vehicles[0] ?? null;
  const isTelemetryMissing = vehicles.length > 0 && !vehicles.some((vehicle) => vehicle.sentry_mode_monitoring_enabled);

  if (isLoading) {
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

  if (isConsentMissing) {
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

  if (isTelegramMissing) {
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
            <SecondaryButton label={t('onboarding.telegramTest')} onPress={() => void sendTelegramTestMessage()} styles={styles} />
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

  if (isVehicleMissing) {
    return (
      <OnboardingFrame
        styles={styles}
        title={t('onboarding.vehiclesTitle')}
        subtitle={t('onboarding.vehiclesSubtitle')}
        t={t}
        message={resolveError(vehiclesQuery.error)}
        actions={<SecondaryButton label={t('onboarding.refresh')} onPress={() => void vehiclesQuery.refetch()} styles={styles} />}
      >
        <StepList
          items={[t('onboarding.vehiclesStep1'), t('onboarding.vehiclesStep2'), t('onboarding.vehiclesStep3')]}
          styles={styles}
        />
      </OnboardingFrame>
    );
  }

  if (isVirtualKeyMissing) {
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

  if (isTelemetryMissing && telemetryVehicle) {
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
          items={vehicles.map((vehicle) => t(vehicle.sentry_mode_monitoring_enabled ? 'onboarding.vehicleEnabled' : 'onboarding.vehicleDisabled', { vehicle: resolveVehicleName(vehicle, t) }))}
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

function OnboardingFrame({
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

type OnboardingStyles = ReturnType<typeof createStyles>;

function StepList({ items, styles }: { items: string[]; styles: OnboardingStyles }): JSX.Element {
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

function PrimaryButton({
  disabled,
  label,
  onPress,
  styles,
}: {
  disabled?: boolean;
  label: string;
  onPress(): void;
  styles: OnboardingStyles;
}): JSX.Element {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.primaryButton, disabled ? styles.disabled : null]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({
  disabled,
  label,
  onPress,
  styles,
}: {
  disabled?: boolean;
  label: string;
  onPress(): void;
  styles: OnboardingStyles;
}): JSX.Element {
  return (
    <Pressable disabled={disabled} onPress={onPress} style={[styles.secondaryButton, disabled ? styles.disabled : null]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

type TranslationFunction = (key: string, options?: Record<string, unknown>) => string;

async function openVirtualKey(setMessage: (message: string | null) => void, t: TranslationFunction): Promise<void> {
  const url = resolveVirtualKeyUrl();

  if (!url) {
    setMessage(t('onboarding.virtualKeyMissingUrl'));
    return;
  }

  await Linking.openURL(url);
  setMessage(t('onboarding.virtualKeyReturn'));
}

function resolveVehicleName(vehicle: Vehicle, t: TranslationFunction): string {
  return vehicle.display_name ?? vehicle.model ?? t('common.vehicleFallback');
}

function resolveError(error: unknown): string | null {
  return error instanceof Error ? error.message : null;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    actions: {
      gap: 10,
    },
    container: {
      backgroundColor: colors.background,
      flex: 1,
    },
    content: {
      gap: 16,
      padding: 20,
    },
    disabled: {
      opacity: 0.55,
    },
    header: {
      gap: 6,
    },
    kicker: {
      color: colors.accent,
      fontSize: 13,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    legalText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 18,
    },
    message: {
      color: colors.warning,
      fontSize: 13,
      lineHeight: 19,
    },
    panel: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 16,
    },
    primaryButton: {
      alignItems: 'center',
      backgroundColor: colors.accent,
      borderRadius: 8,
      padding: 15,
    },
    primaryButtonText: {
      color: colors.accentText,
      fontSize: 15,
      fontWeight: '900',
    },
    secondaryButton: {
      alignItems: 'center',
      borderColor: colors.border,
      borderRadius: 8,
      borderWidth: 1,
      padding: 14,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '800',
    },
    stepNumber: {
      color: colors.accentText,
      fontSize: 12,
      fontWeight: '900',
    },
    stepRow: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: 10,
    },
    stepText: {
      color: colors.text,
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
    },
    steps: {
      gap: 12,
    },
    subtitle: {
      color: colors.muted,
      fontSize: 15,
      lineHeight: 21,
    },
    title: {
      color: colors.text,
      fontSize: 30,
      fontWeight: '900',
    },
  });
}
