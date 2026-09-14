import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { radius, spacing } from '../../core/design/metrics';
import { TextVariant } from '../../core/design/typography';
import { useTheme } from '../../core/theme';
import { AppText, GlassButton, GlassButtonVariant, Icon, Surface } from '../../core/ui';
import { ALERT_SOUNDS, AlertSoundItem, DEFAULT_ALERT_SOUND_ID } from '../../features/notifications/domain/alert-sounds';
import { useSoundPlayer } from '../../core/hooks/useSoundPlayer';

interface SoundSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSound: (soundId: string) => void;
  selectedSoundId?: string;
}

interface SoundItemRowProps {
  isSelected: boolean;
  isPlaying: boolean;
  onPlay: () => void;
  onSelect: () => void;
  sound: AlertSoundItem;
}

function SoundItemRow({ isSelected, isPlaying, onPlay, onSelect, sound }: SoundItemRowProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <Pressable
      onPress={onSelect}
      style={[
        styles.soundRow,
        {
          backgroundColor: isSelected ? colors.secondaryFill : 'transparent',
          borderColor: isSelected ? colors.systemGreen : colors.separator,
        },
      ]}
    >
      <View style={styles.soundInfo}>
        <Icon
          name={isSelected ? 'checkmark.circle.fill' : 'speaker.wave.2.fill'}
          size={20}
          color={isSelected ? colors.systemGreen : colors.secondaryLabel}
        />
        <AppText variant={TextVariant.Body} color={isSelected ? colors.label : colors.secondaryLabel}>
          {t(sound.labelKey)}
        </AppText>
      </View>

      <Pressable
        accessibilityLabel={isPlaying ? t('common.stop') : t('common.play')}
        onPress={onPlay}
        hitSlop={8}
        style={[
          styles.playButton,
          { backgroundColor: isPlaying ? colors.systemRed : colors.secondaryFill },
        ]}
      >
        <Icon
          name={isPlaying ? 'stop.fill' : 'play.fill'}
          size={14}
          color={isPlaying ? '#ffffff' : colors.label}
        />
      </Pressable>
    </Pressable>
  );
}

export function SoundSelectorModal({
  isOpen,
  onClose,
  onSelectSound,
  selectedSoundId = DEFAULT_ALERT_SOUND_ID,
}: SoundSelectorModalProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const { isPlaying, play, stop } = useSoundPlayer();

  const handleClose = () => {
    stop();
    onClose();
  };

  const handleSelect = (soundId: string) => {
    onSelectSound(soundId);
  };

  const handleTogglePlayback = (sound: AlertSoundItem) => {
    if (isPlaying(sound.id)) {
      stop();
      return;
    }
    play(sound.id, sound.asset);
  };

  return (
    <Modal animationType="fade" onRequestClose={handleClose} transparent visible={isOpen}>
      <View style={[styles.modalBackdrop, { backgroundColor: colors.overlay }]}>
        <Surface style={styles.modalCard}>
          <View style={styles.header}>
            <AppText variant={TextVariant.Title3}>{t('settings.alertSound')}</AppText>
            <AppText variant={TextVariant.Subhead} color={colors.secondaryLabel}>
              {t('settings.alertSoundDescription')}
            </AppText>
          </View>

          <View style={styles.soundList}>
            {ALERT_SOUNDS.map((sound) => (
              <SoundItemRow
                key={sound.id}
                sound={sound}
                isSelected={selectedSoundId === sound.id}
                isPlaying={isPlaying(sound.id)}
                onSelect={() => handleSelect(sound.id)}
                onPlay={() => handleTogglePlayback(sound)}
              />
            ))}
          </View>

          <GlassButton label={t('common.done')} variant={GlassButtonVariant.Primary} onPress={handleClose} />
        </Surface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: spacing.xs,
  },
  modalBackdrop: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xxl,
  },
  modalCard: {
    gap: spacing.lg,
    maxWidth: 380,
    width: '100%',
  },
  playButton: {
    alignItems: 'center',
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  soundInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  soundList: {
    gap: spacing.sm,
  },
  soundRow: {
    alignItems: 'center',
    borderRadius: radius.control,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
});
