import { useNavigation } from '@react-navigation/native';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { readableContent, screenPadding, spacing } from '../core/design/metrics';
import { TextVariant } from '../core/design/typography';
import { useTabPaneInsets } from '../core/design/use-screen-inset';
import { useThemeColors } from '../core/theme';
import { AppText, PaneHeader } from '../core/ui';
import { TelegramConfigBlock } from '../features/telegram/presentation/components/TelegramConfigBlock';
import { shouldShowLinkReturnHint } from './telegram-settings/telegram-settings.helpers';
import { useTelegramSettings } from './telegram-settings/use-telegram-settings';

export function TelegramSettingsScreen(): JSX.Element {
  const { t } = useTranslation();
  const navigation = useNavigation();

  useEffect(() => {
    navigation.setOptions({ title: t('telegram.title') });
  }, [navigation, t]);

  return <TelegramSettingsView />;
}

interface TelegramSettingsViewProps {
  onClose?(): void;
}

export function TelegramSettingsView({ onClose }: TelegramSettingsViewProps): JSX.Element {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const paneInsets = useTabPaneInsets();
  const {
    generateTelegramLink,
    isAwaitingTelegramReturn,
    isTelegramLinked,
    refreshTelegramStatus,
    sendTelegramTest,
    telegramLinkInfo,
    telegramStatus,
    unlinkTelegram,
  } = useTelegramSettings();

  return (
    <ScrollView
      style={{ backgroundColor: colors.systemGroupedBackground }}
      contentContainerStyle={[
        styles.content,
        { paddingBottom: screenPadding + paneInsets.paddingBottom, paddingTop: screenPadding + paneInsets.paddingTop },
      ]}
      contentInsetAdjustmentBehavior="automatic"
    >
      {paneInsets.isInsideTabs ? <PaneHeader closeLabel={t('common.done')} onClose={onClose} title={t('settings.telegramSection')} /> : null}

      {shouldShowLinkReturnHint(isAwaitingTelegramReturn, isTelegramLinked) ? (
        <View style={[styles.messageBox, { backgroundColor: colors.warningSurface, borderColor: colors.warningBorder }]}>
          <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
            {t('settings.telegramLinkReturn')}
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
    ...readableContent,
    gap: spacing.md,
    padding: screenPadding,
  },
  messageBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing.md,
  },
});
