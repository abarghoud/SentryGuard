import { useEffect, useState } from 'react';

export function useDeletionCooldown(initialSeconds: number): number {
  const [remainingSeconds, setRemainingSeconds] = useState(initialSeconds);

  useEffect(() => {
    if (remainingSeconds <= 0) {
      return;
    }

    const timeout = setTimeout(() => setRemainingSeconds((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timeout);
  }, [remainingSeconds]);

  return remainingSeconds;
}
