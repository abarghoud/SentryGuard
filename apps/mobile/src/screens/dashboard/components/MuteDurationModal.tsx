import type { JSX } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { radius, spacing } from '../../../core/design/metrics';
import { TextVariant } from '../../../core/design/typography';
import { useHaptics } from '../../../core/design/use-haptics';
import { useThemeColors } from '../../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Icon, Surface } from '../../../core/ui';
import { formatMutedUntilTime, isMuteActive, TranslationFunction } from '../dashboard.helpers';

interface MuteDurationOption {
  minutes: number;
  subtitleKey: string;
  titleKey: string;
}

const MUTE_OPTIONS: MuteDurationOption[] = [
  { minutes: 30, subtitleKey: 'muteModal.duration.30mSubtitle', titleKey: 'muteModal.duration.30m' },
  { minutes: 60, subtitleKey: 'muteModal.duration.1hSubtitle', titleKey: 'muteModal.duration.1h' },
  { minutes: 120, subtitleKey: 'muteModal.duration.2hSubtitle', titleKey: 'muteModal.duration.2h' },
  { minutes: 240, subtitleKey: 'muteModal.duration.4hSubtitle', titleKey: 'muteModal.duration.4h' },
  { minutes: 1440, subtitleKey: 'muteModal.duration.24hSubtitle', titleKey: 'muteModal.duration.24h' },
];

interface MuteDurationModalProps {
  isVisible: boolean;
  mutedUntil: string | null | undefined;
  onClose(): void;
  onMute(minutes: number): void;
  onResume(): void;
  t: TranslationFunction;
}

export function MuteDurationModal({
  isVisible,
  mutedUntil,
  onClose,
  onMute,
  onResume,
  t,
}: MuteDurationModalProps): JSX.Element {
  const colors = useThemeColors();
  const haptics = useHaptics();
  const active = isMuteActive(mutedUntil);

  const handleSelectOption = (minutes: number): void => {
    haptics.selection();
    onMute(minutes);
  };

  const handleResume = (): void => {
    haptics.selection();
    onResume();
  };

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={isVisible}>
      <View style={[styles.backdrop, { backgroundColor: colors.overlay }]}>
        <Surface style={styles.card}>
          <View style={styles.header}>
            <Icon name="bell.slash.fill" size={24} color={colors.warningBorder} />
            <View style={styles.titleBlock}>
              <AppText variant={TextVariant.Title3}>{t('muteModal.title')}</AppText>
              <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
                {active
                  ? t('muteModal.activeUntil', { time: formatMutedUntilTime(mutedUntil, t) })
                  : t('muteModal.subtitle')}
              </AppText>
            </View>
          </View>

          {active ? (
            <GlassButton
              label={t('dashboard.mutedBanner.resume')}
              variant={GlassButtonVariant.Primary}
              onPress={handleResume}
            />
          ) : null}

          <View style={styles.optionsList}>
            {MUTE_OPTIONS.map((option) => (
              <DurationOptionRow
                key={option.minutes}
                option={option}
                onSelect={() => handleSelectOption(option.minutes)}
                t={t}
              />
            ))}
          </View>

          <GlassButton
            label={t('muteModal.cancel')}
            variant={GlassButtonVariant.Plain}
            onPress={onClose}
          />
        </Surface>
      </View>
    </Modal>
  );
}

function DurationOptionRow({
  onSelect,
  option,
  t,
}: {
  onSelect(): void;
  option: MuteDurationOption;
  t: TranslationFunction;
}): JSX.Element {
  const colors = useThemeColors();

  return (
    <Pressable accessibilityRole="button" onPress={onSelect} style={styles.optionRow}>
      {({ pressed }) => (
        <View
          style={[
            styles.optionContent,
            { backgroundColor: pressed ? colors.pressedOverlay : colors.fill },
          ]}
        >
          <View style={styles.optionText}>
            <AppText variant={TextVariant.Headline}>{t(option.titleKey)}</AppText>
            <AppText variant={TextVariant.Caption1} color={colors.secondaryLabel}>
              {t(option.subtitleKey)}
            </AppText>
          </View>
          <Icon name="chevron.right" size={14} color={colors.secondaryLabel} weight="semibold" />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  card: {
    gap: spacing.md,
    maxWidth: 380,
    width: '100%',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
    paddingBottom: spacing.xs,
  },
  optionContent: {
    alignItems: 'center',
    borderRadius: radius.control,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionRow: {
    borderRadius: radius.control,
  },
  optionText: {
    gap: 2,
  },
  optionsList: {
    gap: spacing.xs,
  },
  titleBlock: {
    flex: 1,
    gap: 2,
  },
});
