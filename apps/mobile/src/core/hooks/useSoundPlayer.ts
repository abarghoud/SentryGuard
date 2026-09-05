import { AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';

export interface SoundPlayerRequirements {
  isPlaying: (soundId: string) => boolean;
  play: (soundId: string, asset: number) => void;
  stop: () => void;
}

export function useSoundPlayer(): SoundPlayerRequirements {
  const [playingSoundId, setPlayingSoundId] = useState<string | null>(null);
  const playerRef = useRef<AudioPlayer | null>(null);

  const cleanupCurrentPlayer = useCallback((): void => {
    if (!playerRef.current) {
      return;
    }
    try {
      playerRef.current.pause();
      playerRef.current.remove();
    } catch {
      playerRef.current = null;
    }
    playerRef.current = null;
  }, []);

  const stop = useCallback((): void => {
    cleanupCurrentPlayer();
    setPlayingSoundId(null);
  }, [cleanupCurrentPlayer]);

  const attachFinishListener = useCallback(
    (player: AudioPlayer): void => {
      player.addListener('playbackStatusUpdate', (status) => {
        if (status.didJustFinish) {
          stop();
        }
      });
    },
    [stop]
  );

  const play = useCallback(
    (soundId: string, asset: number): void => {
      stop();
      try {
        void setAudioModeAsync({ playsInSilentMode: true });
        const player = createAudioPlayer(asset);
        playerRef.current = player;
        setPlayingSoundId(soundId);
        attachFinishListener(player);
        player.play();
      } catch {
        stop();
      }
    },
    [attachFinishListener, stop]
  );

  useEffect(() => () => stop(), [stop]);

  const isPlaying = useCallback(
    (soundId: string): boolean => playingSoundId === soundId,
    [playingSoundId]
  );

  return { isPlaying, play, stop };
}
