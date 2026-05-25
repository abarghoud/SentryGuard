import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemeColors, ThemeMode, useTheme } from '../core/theme';
import { getAuthProfile } from '../services/api/auth-api';
import { getNotificationPreferences, registerPushToken, updateNotificationPreferences, type NotificationPreferences } from '../services/api/notifications-api';
import { getUserLanguage, updateUserLanguage, UserLanguage } from '../services/api/user-language-api';
import { requestExpoPushToken } from '../services/notifications/push-notifications';

interface SettingsScreenProps {
  onLogout(): Promise<void>;
}

export function SettingsScreen({ onLogout }: SettingsScreenProps): JSX.Element {
  const { i18n, t } = useTranslation();
  const [preferenceMessage, setPreferenceMessage] = useState<string | null>(null);
  const hasRegisteredPushToken = useRef(false);
  const queryClient = useQueryClient();
  const { colors, mode, setMode } = useTheme();
  const styles = createStyles(colors);
  const profileQuery = useQuery({
    queryFn: getAuthProfile,
    queryKey: ['auth-profile'],
  });
  const preferencesQuery = useQuery({
    queryFn: getNotificationPreferences,
    queryKey: ['notification-preferences'],
  });
  const languageQuery = useQuery({
    queryFn: getUserLanguage,
    queryKey: ['user-language'],
  });
  const preferencesMutation = useMutation({
    mutationFn: updateNotificationPreferences,
    onSuccess: (preferences) => {
      queryClient.setQueryData(['notification-preferences'], preferences);
    },
  });
  const languageMutation = useMutation({
    mutationFn: updateUserLanguage,
    onSuccess: async (language) => {
      await i18n.changeLanguage(language.language);
      queryClient.setQueryData(['user-language'], language);
    },
  });

  const profile = profileQuery.data?.profile;
  const preferences = preferencesQuery.data ?? defaultPreferences;

  useEffect(() => {
    const language = languageQuery.data?.language;
    if (language && i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [i18n, languageQuery.data?.language]);

  useEffect(() => {
    if (!preferencesQuery.data?.push_enabled || hasRegisteredPushToken.current || Platform.OS === 'web') {
      return;
    }

    void registerDeviceForPush(undefined, t).then((isRegistered) => {
      hasRegisteredPushToken.current = isRegistered;
    });
  }, [preferencesQuery.data?.push_enabled, t]);

  const updatePreference = async (updates: Partial<NotificationPreferences>): Promise<void> => {
    setPreferenceMessage(null);
    if (updates.push_enabled === true) {
      try {
        const isRegistered = await registerDeviceForPush(setPreferenceMessage, t);
        if (!isRegistered) {
          setPreferenceMessage(Platform.OS === 'web' ? t('settings.pushNativeOnly') : t('settings.pushNoToken'));
          return;
        }
      } catch {
        setPreferenceMessage(t('settings.pushError'));
        return;
      }
    }
    const preferences = await preferencesMutation.mutateAsync(resolvePreferenceUpdates(updates));

    if (updates.critical_alerts_enabled === true && preferences.critical_alerts_enabled !== true) {
      setPreferenceMessage(t('settings.criticalAlertsUnavailable'));
    }
  };

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
          <ThemeOption
            isActive={mode === ThemeMode.Dark}
            label={t('settings.dark')}
            onPress={() => void setMode(ThemeMode.Dark)}
            styles={styles}
          />
          <ThemeOption
            isActive={mode === ThemeMode.Light}
            label={t('settings.light')}
            onPress={() => void setMode(ThemeMode.Light)}
            styles={styles}
          />
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
          {preferenceMessage ?? resolveSettingsError(preferencesQuery.error ?? preferencesMutation.error ?? languageQuery.error ?? languageMutation.error, t)}
        </Text>
      ) : null}

      <Pressable style={styles.logoutButton} onPress={() => void onLogout()}>
        <Text style={styles.logoutText}>{t('settings.logout')}</Text>
      </Pressable>
    </ScrollView>
  );
}

type SettingsStyles = ReturnType<typeof createStyles>;

function SettingRow({ label, styles, value }: { label: string; styles: SettingsStyles; value: string }): JSX.Element {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function PreferenceRow({
  description,
  disabled,
  isNested = false,
  label,
  onValueChange,
  styles,
  value,
}: {
  description?: string;
  disabled: boolean;
  isNested?: boolean;
  label: string;
  onValueChange(value: boolean): void;
  styles: SettingsStyles;
  value: boolean;
}): JSX.Element {
  return (
    <View style={[styles.preferenceRow, description ? styles.describedPreferenceRow : null, isNested ? styles.nestedPreferenceRow : null, disabled ? styles.disabledPreferenceRow : null]}>
      <View style={styles.preferenceText}>
        <Text style={[styles.rowValue, isNested ? styles.nestedRowValue : null, disabled ? styles.disabledRowValue : null]}>{label}</Text>
        {description ? <Text style={styles.rowLabel}>{description}</Text> : null}
      </View>
      <ToggleSwitch disabled={disabled} isOn={value} onToggle={() => onValueChange(!value)} styles={styles} />
    </View>
  );
}

function ToggleSwitch({
  disabled,
  isOn,
  onToggle,
  styles,
}: {
  disabled: boolean;
  isOn: boolean;
  onToggle(): void;
  styles: SettingsStyles;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: isOn }}
      disabled={disabled}
      onPress={onToggle}
      style={[styles.toggleTrack, isOn ? styles.toggleTrackOn : styles.toggleTrackOff, disabled ? styles.disabledSwitch : null]}
    >
      <View style={[styles.toggleThumb, isOn ? styles.toggleThumbOn : styles.toggleThumbOff]} />
    </Pressable>
  );
}

const defaultPreferences: NotificationPreferences = {
  critical_alerts_enabled: false,
  critical_only: false,
  push_enabled: false,
  telegram_enabled: true,
};

function resolvePreferenceUpdates(updates: Partial<NotificationPreferences>): Partial<NotificationPreferences> {
  if (updates.push_enabled === false) {
    return { ...updates, critical_alerts_enabled: false };
  }

  return updates;
}

async function registerDeviceForPush(setMessage: ((message: string | null) => void) | undefined, t: (key: string) => string): Promise<boolean> {
  const token = await requestExpoPushToken();
  if (!token) {
    setMessage?.(Platform.OS === 'web' ? t('settings.pushNativeOnly') : t('settings.pushPermissionDenied'));
    return false;
  }

  await registerPushToken(token, Platform.OS);
  return true;
}

function resolveSettingsError(error: unknown, t: (key: string) => string): string {
  return error instanceof Error ? error.message : t('settings.error');
}

function ThemeOption({
  isActive,
  label,
  onPress,
  styles,
}: {
  isActive: boolean;
  label: string;
  onPress(): void;
  styles: SettingsStyles;
}): JSX.Element {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      onPress={onPress}
      style={[styles.themeOption, isActive ? styles.activeThemeOption : null]}
    >
      <Text style={[styles.themeOptionText, isActive ? styles.activeThemeOptionText : null]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
  activeThemeOption: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  activeThemeOptionText: {
    color: colors.accentText,
  },
  container: {
    flex: 1,
  },
  content: {
    gap: 16,
    padding: 20,
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
  logoutButton: {
    alignItems: 'center',
    borderColor: colors.critical,
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  logoutText: {
    color: colors.critical,
    fontSize: 15,
    fontWeight: '900',
  },
  disabledSwitch: {
    opacity: 0.55,
  },
  disabledPreferenceRow: {
    opacity: 0.55,
  },
  disabledRowValue: {
    color: colors.muted,
  },
  panel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
  },
  preferenceRow: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 62,
    paddingHorizontal: 16,
  },
  describedPreferenceRow: {
    paddingVertical: 12,
  },
  preferenceText: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  nestedPreferenceRow: {
    paddingLeft: 28,
  },
  nestedRowValue: {
    fontSize: 14,
  },
  row: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: 4,
    padding: 16,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 13,
  },
  rowValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionTitle: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '900',
    marginBottom: -8,
    paddingHorizontal: 4,
    textTransform: 'uppercase',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
  },
  statusText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  themeHeader: {
    gap: 4,
    padding: 16,
    paddingBottom: 10,
  },
  themeOption: {
    alignItems: 'center',
    borderColor: colors.border,
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 12,
  },
  themeOptionText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  themeSelector: {
    flexDirection: 'row',
    gap: 10,
    padding: 16,
    paddingTop: 0,
  },
  toggleThumb: {
    backgroundColor: colors.accentText,
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  toggleThumbOff: {
    backgroundColor: colors.muted,
    transform: [{ translateX: 2 }],
  },
  toggleThumbOn: {
    transform: [{ translateX: 24 }],
  },
  toggleTrack: {
    borderRadius: 14,
    height: 28,
    justifyContent: 'center',
    width: 48,
  },
  toggleTrackOff: {
    backgroundColor: colors.panel,
    borderColor: colors.border,
    borderWidth: 1,
  },
  toggleTrackOn: {
    backgroundColor: colors.control,
  },
  title: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  });
}
