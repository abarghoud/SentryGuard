import type { JSX } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Share, StyleSheet, View } from 'react-native';
import * as Linking from 'expo-linking';

import { TelegramLinkInfo, TelegramStatus } from '@sentryguard/telegram-domain';
import { resolveRemainingLinkMinutes } from '../telegram-link.helpers';
import { radius, spacing } from '../../../../core/design/metrics';
import { TextVariant } from '../../../../core/design/typography';
import { useTheme } from '../../../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Surface } from '../../../../core/ui';

interface TelegramConfigBlockProps {
  status: TelegramStatus | null;
  linkInfo: TelegramLinkInfo | null;
  onGenerateLink(): Promise<TelegramLinkInfo | null>;
  onUnlink(): Promise<boolean>;
  onSendTest(): Promise<boolean>;
  onRefresh(): Promise<void>;
}

export function TelegramConfigBlock({
  status,
  linkInfo,
  onGenerateLink,
  onUnlink,
  onSendTest,
  onRefresh,
}: TelegramConfigBlockProps): JSX.Element {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  useEffect(() => {
    if (status?.status === 'pending' && autoRefresh) {
      const interval = setInterval(() => {
        void onRefresh();
      }, 3000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [status?.status, autoRefresh, onRefresh]);

  const handleGenerate = async (): Promise<void> => {
    setIsGenerating(true);
    try {
      await onGenerateLink();
      setAutoRefresh(true);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUnlink = async (): Promise<void> => {
    Alert.alert(
      t('telegram.unlink'),
      t('telegram.unlinkConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('telegram.unlink'),
          style: 'destructive',
          onPress: async () => {
            setIsUnlinking(true);
            try {
              await onUnlink();
              setAutoRefresh(false);
            } finally {
              setIsUnlinking(false);
            }
          },
        },
      ]
    );
  };

  const handleTest = async (): Promise<void> => {
    setIsTesting(true);
    try {
      const success = await onSendTest();
      if (success) {
        Alert.alert(t('telegram.title'), t('telegram.testSent'));
      }
    } finally {
      setIsTesting(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    if (linkInfo?.link) {
      await Share.share({
        message: linkInfo.link,
      });
    }
  };

  const handleOpenBot = async (): Promise<void> => {
    if (linkInfo?.link) {
      await Linking.openURL(linkInfo.link);
    }
  };

  const isLinked = status?.linked === true;
  const isPending = status?.status === 'pending';
  const pendingExpiryMinutes = linkInfo?.expires_in_minutes ?? resolveRemainingLinkMinutes(status?.expires_at, new Date());

  return (
    <Surface style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <AppText variant={TextVariant.Title3} style={styles.title}>
            {t('telegram.title')}
          </AppText>
        </View>
        {isLinked ? (
          <View style={[styles.badge, { backgroundColor: colors.successSurface }]}>
            <AppText variant={TextVariant.Footnote} color={colors.systemGreen}>
              {t('telegram.linked')}
            </AppText>
          </View>
        ) : isPending ? (
          <View style={[styles.badge, { backgroundColor: colors.warningSurface }]}>
            <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
              {t('telegram.notLinked')}
            </AppText>
          </View>
        ) : null}
      </View>

      <AppText variant={TextVariant.Body} color={colors.secondaryLabel} style={styles.description}>
        {isLinked ? t('telegram.connected') : t('telegram.disconnected')}
      </AppText>

      {!isLinked && !isPending && (
        <GlassButton
          label={isGenerating ? t('telegram.generating') : t('telegram.generateLink')}
          disabled={isGenerating}
          onPress={handleGenerate}
        />
      )}

      {isPending ? (
        <View style={styles.pendingSection}>
          <View style={[styles.alertBox, { backgroundColor: colors.warningSurface, borderColor: colors.warningBorder }]}>
            <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
              {t('telegram.waiting')}
            </AppText>
            {pendingExpiryMinutes === null ? null : (
              <AppText variant={TextVariant.Caption2} color={colors.secondaryLabel} style={styles.expiryText}>
                {t('telegram.linkExpires', { minutes: pendingExpiryMinutes })}
              </AppText>
            )}
          </View>

          {linkInfo ? (
            <View style={styles.buttonRow}>
              <GlassButton
                variant={GlassButtonVariant.Secondary}
                label={t('telegram.copy')}
                icon="link"
                onPress={handleShare}
                style={styles.fullButton}
              />
              <GlassButton
                label={t('telegram.openBot')}
                icon="paperplane.fill"
                onPress={handleOpenBot}
                style={styles.fullButton}
              />
            </View>
          ) : (
            <GlassButton
              label={isGenerating ? t('telegram.generating') : t('telegram.generateLink')}
              disabled={isGenerating}
              onPress={handleGenerate}
            />
          )}
        </View>
      ) : null}

      {isLinked && (
        <View style={styles.linkedSection}>
          <View style={[styles.alertBox, { backgroundColor: colors.successSurface, borderColor: colors.successBorder }]}>
            <AppText variant={TextVariant.Footnote} color={colors.systemGreen}>
              {t('telegram.success')}
            </AppText>
            {status?.linked_at && (
              <AppText variant={TextVariant.Caption2} color={colors.secondaryLabel} style={styles.expiryText}>
                {t('telegram.linkedOn')} {new Date(status.linked_at).toLocaleDateString()}
              </AppText>
            )}
          </View>

          <View style={styles.buttonRow}>
            <GlassButton
              variant={GlassButtonVariant.Secondary}
              label={isTesting ? t('telegram.sendingTest') : t('telegram.sendTest')}
              disabled={isTesting}
              onPress={handleTest}
              style={styles.fullButton}
            />
            <GlassButton
              variant={GlassButtonVariant.Secondary}
              destructive
              label={isUnlinking ? t('telegram.unlinking') : t('telegram.unlink')}
              disabled={isUnlinking}
              icon="trash.fill"
              onPress={handleUnlink}
              style={styles.fullButton}
            />
          </View>
        </View>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  alertBox: {
    borderRadius: radius.control,
    borderWidth: 1,
    gap: spacing.xs,
    padding: spacing.md,
    width: '100%',
  },
  badge: {
    borderRadius: radius.control / 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  buttonRow: {
    flexDirection: 'column',
    gap: spacing.sm,
    width: '100%',
  },
  card: {
    gap: spacing.md,
    width: '100%',
  },
  description: {
    marginBottom: spacing.xs,
  },
  expiryText: {
    marginTop: 2,
  },
  fullButton: {
    width: '100%',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  linkedSection: {
    gap: spacing.md,
    width: '100%',
  },
  pendingSection: {
    gap: spacing.md,
    width: '100%',
  },
  title: {
    fontWeight: 'bold',
  },
  titleContainer: {
    flex: 1,
  },
});
