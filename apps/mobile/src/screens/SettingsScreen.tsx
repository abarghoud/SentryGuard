import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { radius, screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useScreenTopInset } from '../core/design/use-screen-inset';
import { MainStackParamList } from '../core/navigation';
import { ThemeMode, useTheme } from '../core/theme';
import { AppSwitch, AppText, GlassButton, GlassButtonVariant, ListRow, ListSection, SegmentedControl, Surface } from '../core/ui';
import { UserLanguage } from '../features/user/domain/entities';
import { resolveTelegramStatusKey } from './telegram-settings/telegram-settings.helpers';
import {
  openAndroidDoNotDisturbAccessSettings,
  openDonation,
  openPrivacyPolicy,
  openTermsOfService,
  resolveSettingsError,
} from './settings/settings.helpers';
import { useSettings } from './settings/use-settings';

interface SettingsScreenProps {
  onLogout(): Promise<void>;
}

export function SettingsScreen({ onLogout }: SettingsScreenProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const topInset = useScreenTopInset();
  const {
    isDndAccessModalOpen,
    isTelegramLinked,
    languageMutation,
    languageQuery,
    preferenceMessage,
    preferences,
    preferencesMutation,
    preferencesQuery,
    profile,
    setIsDndAccessModalOpen,
    updatePreference,
  } = useSettings();

  const isBusy = preferencesMutation.isPending;
  const language = languageQuery.data?.language ?? UserLanguage.French;

  const navigation = useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const statusMessage =
    preferenceMessage ??
    (preferencesQuery.error || preferencesMutation.error || languageQuery.error || languageMutation.error
      ? resolveSettingsError(preferencesQuery.error ?? preferencesMutation.error ?? languageQuery.error ?? languageMutation.error, t)
      : null);

  return (
    <ScrollView
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={[styles.content, { paddingTop: topInset + spacing.sm }]}
      contentInsetAdjustmentBehavior="automatic"
    >
      <AppText variant={TextVariant.LargeTitle} style={styles.title}>
        {t('settings.title')}
      </AppText>

      {statusMessage ? (
        <View style={[styles.messageBox, { backgroundColor: colors.warningSurface, borderColor: colors.warningBorder }]}>
          <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
            {statusMessage}
          </AppText>
        </View>
      ) : null}

      <ListSection header={t('settings.account')} footer={profile?.isBetaTester ? t('settings.betaFooter') : undefined}>
        <ListRow stacked title={t('settings.email')} value={profile?.email ?? t('common.notProvided')} />
        <ListRow stacked title={t('settings.name')} value={profile?.full_name ?? t('common.notProvided')} />
      </ListSection>

      <Surface style={styles.selectorCard}>
        <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
          {t('settings.theme')}
        </AppText>
        <SegmentedControl
          value={mode}
          onChange={(next) => void setMode(next)}
          options={[
            { label: t('settings.system'), value: ThemeMode.System },
            { label: t('settings.light'), value: ThemeMode.Light },
            { label: t('settings.dark'), value: ThemeMode.Dark },
          ]}
        />
      </Surface>

      <Surface style={styles.selectorCard}>
        <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
          {t('settings.language')}
        </AppText>
        <SegmentedControl
          value={language}
          onChange={(next) => languageMutation.mutate(next)}
          options={[
            { label: 'Français', value: UserLanguage.French },
            { label: 'English', value: UserLanguage.English },
          ]}
        />
      </Surface>

      <ListSection header={t('settings.notifications')}>
        <ListRow
          title={t('settings.push')}
          accessory={<AppSwitch accessibilityLabel={t('settings.push')} disabled={isBusy} value={preferences.push_enabled} onValueChange={(value) => void updatePreference({ push_enabled: value })} />}
        />
        <ListRow
          title={t('settings.criticalOnly')}
          accessory={
            <AppSwitch
              accessibilityLabel={t('settings.criticalOnly')}
              disabled={isBusy || !preferences.push_enabled}
              value={preferences.critical_only}
              onValueChange={(value) => void updatePreference({ critical_only: value })}
            />
          }
        />
        <ListRow
          title={t('settings.criticalAlerts')}
          subtitle={t('settings.criticalAlertsDescription')}
          accessory={
            <AppSwitch
              accessibilityLabel={t('settings.criticalAlerts')}
              disabled={isBusy || !preferences.push_enabled}
              value={preferences.critical_alerts_enabled}
              onValueChange={(value) => void updatePreference({ critical_alerts_enabled: value })}
            />
          }
        />
      </ListSection>

      <ListSection header={t('settings.telegramSection')} footer={isTelegramLinked ? undefined : t('settings.telegramConnectSubtitle')}>
        <ListRow
          title={t('settings.telegramAccount')}
          value={t(resolveTelegramStatusKey(isTelegramLinked))}
          showChevron
          onPress={() => navigation.navigate('TelegramSettings')}
        />
        {isTelegramLinked ? (
          <ListRow
            title={t('settings.notifications')}
            accessory={
              <AppSwitch
                accessibilityLabel={t('settings.telegram')}
                disabled={isBusy}
                value={preferences.telegram_enabled}
                onValueChange={(value) => void updatePreference({ telegram_enabled: value })}
              />
            }
          />
        ) : null}
      </ListSection>

      <ListSection header={t('settings.supportSection')} footer={t('settings.supportFooter')}>
        <ListRow
          icon="cup.and.saucer.fill"
          iconColor={colors.secondaryLabel}
          title={t('settings.support')}
          showChevron
          onPress={() => void openDonation()}
        />
      </ListSection>

      <ListSection header={t('settings.legalSection')}>
        <ListRow title={t('settings.privacyPolicy')} showChevron onPress={() => void openPrivacyPolicy(i18n.language)} />
        <ListRow title={t('settings.terms')} showChevron onPress={() => void openTermsOfService(i18n.language)} />
        <ListRow title={t('settings.deleteAccount')} showChevron onPress={() => navigation.navigate('DeleteAccount')} />
      </ListSection>

      <GlassButton
        label={t('settings.logout')}
        variant={GlassButtonVariant.Secondary}
        destructive
        icon="rectangle.portrait.and.arrow.right"
        onPress={() => void onLogout()}
        style={styles.logout}
      />

      <Modal animationType="fade" onRequestClose={() => setIsDndAccessModalOpen(false)} transparent visible={isDndAccessModalOpen}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Surface style={styles.modalCard}>
            <AppText variant={TextVariant.Title3}>{t('settings.dndAccessTitle')}</AppText>
            <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
              {t('settings.dndAccessDescription')}
            </AppText>
            <GlassButton label={t('settings.dndAccessButton')} onPress={() => void openAndroidDoNotDisturbAccessSettings(setIsDndAccessModalOpen)} />
            <GlassButton label={t('common.cancel')} variant={GlassButtonVariant.Plain} onPress={() => setIsDndAccessModalOpen(false)} />
          </Surface>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.sm,
  },
  logout: {
    marginTop: spacing.sm,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    gap: spacing.md,
    maxWidth: 360,
    width: '100%',
  },
  selectorCard: {
    gap: spacing.md,
  },
  title: {
    paddingTop: spacing.sm,
  },
  messageBox: {
    borderRadius: radius.control,
    borderWidth: 1,
    padding: spacing.md,
    width: '100%',
  },
});
