import { useEffect, useState } from 'react';

export function useCurrentTime(refreshIntervalMilliseconds: number): number {
  const [currentTime, setCurrentTime] = useState(() => Date.now());

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(Date.now()), refreshIntervalMilliseconds);

    return () => clearInterval(interval);
  }, [refreshIntervalMilliseconds]);

  return currentTime;
}
