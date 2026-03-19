'use client';

import { useBetaTester } from '../lib/useBetaTester';

interface BetaFeatureProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  showBadge?: boolean;
}

export default function BetaFeature({ children, fallback, showBadge }: BetaFeatureProps) {
  const { isBetaTester } = useBetaTester();

  if (!isBetaTester) {
    return fallback ? <>{fallback}</> : null;
  }

  return (
    <>
      {showBadge && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 mr-2">
          Beta
        </span>
      )}
      {children}
    </>
  );
}
