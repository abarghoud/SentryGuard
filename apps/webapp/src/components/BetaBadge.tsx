'use client';

import { useAuth } from '../features/auth/presentation/hooks/use-auth';

interface BetaBadgeProps {
  className?: string;
}

export default function BetaBadge({ className }: BetaBadgeProps) {
  const { profile } = useAuth();
  const isBetaTester = profile?.isBetaTester ?? false;

  if (!isBetaTester) {
    return null;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 ${className || ''}`}>
      Beta
    </span>
  );
}
