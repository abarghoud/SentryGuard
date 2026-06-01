import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { ThemeMode, useTheme } from '../core/theme';
import { UserLanguage } from '../features/user/domain/entities';
import { PreferenceRow } from './settings/components/PreferenceRow';
import { SettingRow } from './settings/components/SettingRow';
import { ThemeOption } from './settings/components/ThemeOption';
import { openAndroidDoNotDisturbAccessSettings, resolveSettingsError } from './settings/settings.helpers';
import { createSettingsStyles } from './settings/settings.styles';
import { useSettings } from './settings/use-settings';

interface SettingsScreenProps {
  onLogout(): Promise<void>;
}

export function SettingsScreen({ onLogout }: SettingsScreenProps): JSX.Element {
  const { t } = useTranslation();
  const { colors, mode, setMode } = useTheme();
  const styles = createSettingsStyles(colors);
  const {
    isDndAccessModalOpen,
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.kicker}>{t('settings.account')}</Text>
        <Text style={styles.title}>{t('settings.title')}</Text>
        <Text style={styles.subtitle}>{t('settings.profileSubtitle')}</Text>
      </View>

      <View style={styles.panel}>
        <SettingRow label={t('settings.email')} styles={styles} value={profile?.email ?? t('common.notProvided')} />
        <SettingRow label={t('settings.name')} styles={styles} value={profile?.full_name ?? t('common.notProvided')} />
        {profile?.isBetaTester ? <SettingRow label={t('settings.beta')} styles={styles} value={t('common.active')} /> : null}
      </View>

      <View style={styles.panel}>
        <View style={styles.themeHeader}>
          <Text style={styles.rowValue}>{t('settings.theme')}</Text>
          <Text style={styles.rowLabel}>{t('settings.themeSubtitle')}</Text>
        </View>
        <View style={styles.themeSelector}>
          <ThemeOption isActive={mode === ThemeMode.Dark} label={t('settings.dark')} onPress={() => void setMode(ThemeMode.Dark)} styles={styles} />
          <ThemeOption isActive={mode === ThemeMode.Light} label={t('settings.light')} onPress={() => void setMode(ThemeMode.Light)} styles={styles} />
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.themeHeader}>
          <Text style={styles.rowValue}>{t('settings.language')}</Text>
        </View>
        <View style={styles.themeSelector}>
          <ThemeOption
            isActive={(languageQuery.data?.language ?? UserLanguage.French) === UserLanguage.French}
            label="Français"
            onPress={() => languageMutation.mutate(UserLanguage.French)}
            styles={styles}
          />
          <ThemeOption
            isActive={languageQuery.data?.language === UserLanguage.English}
            label="English"
            onPress={() => languageMutation.mutate(UserLanguage.English)}
            styles={styles}
          />
        </View>
      </View>

      <Text style={styles.sectionTitle}>{t('settings.notifications')}</Text>
      <View style={styles.panel}>
        <PreferenceRow
          disabled={preferencesMutation.isPending}
          label={t('settings.push')}
          styles={styles}
          value={preferences.push_enabled}
          onValueChange={(value) => void updatePreference({ push_enabled: value })}
        />
        <PreferenceRow
          disabled={preferencesMutation.isPending || !preferences.push_enabled}
          label={t('settings.criticalOnly')}
          styles={styles}
          value={preferences.critical_only}
          onValueChange={(value) => void updatePreference({ critical_only: value })}
        />
        <PreferenceRow
          description={t('settings.criticalAlertsDescription')}
          disabled={preferencesMutation.isPending || !preferences.push_enabled}
          isNested
          label={t('settings.criticalAlerts')}
          styles={styles}
          value={preferences.critical_alerts_enabled}
          onValueChange={(value) => void updatePreference({ critical_alerts_enabled: value })}
        />
      </View>

      <Text style={styles.sectionTitle}>{t('settings.telegramSection')}</Text>
      <View style={styles.panel}>
        <PreferenceRow
          disabled={preferencesMutation.isPending}
          label={t('settings.telegram')}
          styles={styles}
          value={preferences.telegram_enabled}
          onValueChange={(value) => void updatePreference({ telegram_enabled: value })}
        />
      </View>

      {preferencesQuery.error || preferencesMutation.error || languageQuery.error || languageMutation.error || preferenceMessage ? (
        <Text style={styles.statusText}>
          {preferenceMessage ??
            resolveSettingsError(preferencesQuery.error ?? preferencesMutation.error ?? languageQuery.error ?? languageMutation.error, t)}
        </Text>
      ) : null}

      <Pressable style={styles.logoutButton} onPress={() => void onLogout()}>
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>

      <Modal animationType="fade" onRequestClose={() => setIsDndAccessModalOpen(false)} transparent visible={isDndAccessModalOpen}>
        <View style={styles.modalBackdrop}>
          <View style={styles.dndAccessModal}>
            <Text style={styles.modalTitle}>{t('settings.dndAccessTitle')}</Text>
            <Text style={styles.modalDescription}>{t('settings.dndAccessDescription')}</Text>
            <Pressable style={styles.primaryButton} onPress={() => void openAndroidDoNotDisturbAccessSettings(setIsDndAccessModalOpen)}>
              <Text style={styles.primaryButtonText}>{t('settings.dndAccessButton')}</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => setIsDndAccessModalOpen(false)}>
              <Text style={styles.secondaryButtonText}>{t('common.cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
