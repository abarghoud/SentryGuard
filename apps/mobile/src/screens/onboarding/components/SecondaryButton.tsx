import type { JSX } from 'react';

import { GlassButton, GlassButtonVariant } from '../../../core/ui';

export function SecondaryButton({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress(): void }): JSX.Element {
  return <GlassButton label={label} disabled={disabled} onPress={onPress} variant={GlassButtonVariant.Secondary} />;
}
