import { lockAsync, OrientationLock, unlockAsync } from 'expo-screen-orientation';
import { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';

import { appLogger } from '../logging';
import { OrientationPolicy, resolveOrientationPolicy } from './orientation-policy';

export function useLargeScreenRotation(): void {
  const { height, width } = useWindowDimensions();
  const policy = resolveOrientationPolicy({ height, width });

  useEffect(() => {
    applyOrientationPolicy(policy).catch((error: unknown) => {
      appLogger.warn('orientation', `Could not apply the ${policy} orientation policy`, error);
    });
  }, [policy]);
}

function applyOrientationPolicy(policy: OrientationPolicy): Promise<void> {
  return policy === OrientationPolicy.Free ? unlockAsync() : lockAsync(OrientationLock.PORTRAIT_UP);
}
