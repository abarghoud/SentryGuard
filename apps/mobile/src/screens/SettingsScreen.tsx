import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useMemo, type JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { radius, screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useScreenTopInset } from '../core/design/use-screen-inset';
import { MainStackParamList } from '../core/navigation';
import { ThemeMode, useTheme } from '../core/theme';
import { AppSwitch, AppText, GlassButton, GlassButtonVariant, Icon, ListRow, ListSection, SegmentedControl, Surface } from '../core/ui';
import { UserLanguage } from '../features/user/domain/entities';
import { resolveTelegramStatusKey } from './telegram-settings/telegram-settings.helpers';
import {
  openAndroidDoNotDisturbAccessSettings,
  openPrivacyPolicy,
  openTermsOfService,
  resolveSettingsError,
} from './settings/settings.helpers';
import { useSettings } from './settings/use-settings';

interface SettingsScreenProps {
  onLogout(): Promise<void>;
}

const LANGUAGE_OPTIONS: { label: string; value: UserLanguage }[] = [
  { label: 'English', value: UserLanguage.English },
  { label: 'Français', value: UserLanguage.French },
  { label: 'Deutsch', value: UserLanguage.German },
  { label: 'Nederlands', value: UserLanguage.Dutch },
  { label: 'Norsk', value: UserLanguage.Norwegian },
  { label: 'Español', value: UserLanguage.Spanish },
  { label: 'Italiano', value: UserLanguage.Italian },
  { label: 'Svenska', value: UserLanguage.Swedish },
  { label: 'Dansk', value: UserLanguage.Danish },
];

export function SettingsScreen({ onLogout }: SettingsScreenProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const topInset = useScreenTopInset();
  const {
    isDndAccessModalOpen,
    isLanguageModalOpen,
    isTelegramLinked,
    languageMutation,
    languageQuery,
    preferenceMessage,
    preferences,
    preferencesMutation,
    preferencesQuery,
    profile,
    setIsDndAccessModalOpen,
    setIsLanguageModalOpen,
    updatePreference,
  } = useSettings();

  const isBusy = preferencesMutation.isPending;
  const language = languageQuery.data?.language ?? UserLanguage.French;
  const currentLanguageOption = useMemo(
    () => LANGUAGE_OPTIONS.find((option) => option.value === language) ?? LANGUAGE_OPTIONS[0],
    [language]
  );

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

      <ListSection header={t('settings.language')}>
        <ListRow
          title={currentLanguageOption.label}
          showChevron
          onPress={() => setIsLanguageModalOpen(true)}
        />
      </ListSection>

      <ListSection header={t('settings.notifications')}>
        <ListRow
          title={t('settings.push')}
          accessory={<AppSwitch accessibilityLabel={t('settings.push')} disabled={isBusy} value={preferences.push_enabled} onValueChange={(value) => void updatePreference({ push_enabled: value })} />}
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

      <Modal animationType="fade" onRequestClose={() => setIsLanguageModalOpen(false)} transparent visible={isLanguageModalOpen}>
        <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
          <Surface style={styles.modalCard}>
            <AppText variant={TextVariant.Title3}>{t('settings.language')}</AppText>
            {LANGUAGE_OPTIONS.map((option) => (
              <ListRow
                key={option.value}
                title={option.label}
                onPress={() => {
                  languageMutation.mutate(option.value);
                  setIsLanguageModalOpen(false);
                }}
                accessory={
                  option.value === language ? (
                    <Icon name="checkmark" size={16} color={colors.accent} weight="semibold" />
                  ) : null
                }
              />
            ))}
            <GlassButton label={t('common.cancel')} variant={GlassButtonVariant.Plain} onPress={() => setIsLanguageModalOpen(false)} />
          </Surface>
        </View>
      </Modal>

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
