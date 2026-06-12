import type { JSX } from 'react';

import { GlassButton } from '../../../core/ui';

export function PrimaryButton({ disabled, label, onPress }: { disabled?: boolean; label: string; onPress(): void }): JSX.Element {
  return <GlassButton label={label} disabled={disabled} onPress={onPress} />;
}
