import { useNavigation } from '@react-navigation/native';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useThemeColors } from '../core/theme';
import { AppText } from '../core/ui';
import { TelegramConfigBlock } from '../features/telegram/presentation/components/TelegramConfigBlock';
import { useTelegramSettings } from './telegram-settings/use-telegram-settings';

export function TelegramSettingsScreen(): JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const colors = useThemeColors();
  const {
    generateTelegramLink,
    message,
    refreshTelegramStatus,
    sendTelegramTest,
    telegramLinkInfo,
    telegramStatus,
    unlinkTelegram,
  } = useTelegramSettings();

  useEffect(() => {
    navigation.setOptions({ title: t('telegram.title') });
  }, [navigation, t]);

  return (
    <ScrollView
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={styles.content}
    >
      {message ? (
        <View style={[styles.messageBox, { backgroundColor: colors.systemOrange + '15', borderColor: colors.systemOrange + '30' }]}>
          <AppText variant={TextVariant.Footnote} color={colors.systemOrange}>
            {message}
          </AppText>
        </View>
      ) : null}

      <TelegramConfigBlock
        status={telegramStatus}
        linkInfo={telegramLinkInfo}
        onGenerateLink={generateTelegramLink}
        onUnlink={unlinkTelegram}
        onSendTest={sendTelegramTest}
        onRefresh={refreshTelegramStatus}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md,
    padding: screenPadding,
  },
  messageBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
});
