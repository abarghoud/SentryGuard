'use client';

import { useMemo } from 'react';
import { useAuth } from './useAuth';

export function useBetaTester() {
  const { profile } = useAuth();

  const isBetaTester = useMemo(() => {
    return profile?.isBetaTester ?? false;
  }, [profile]);

  return {
    isBetaTester,
  };
}
