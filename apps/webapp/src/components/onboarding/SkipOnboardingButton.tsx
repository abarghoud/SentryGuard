'use client';

import { useTranslation } from 'react-i18next';

interface SkipOnboardingButtonProps {
  disabled: boolean;
  onSkip: () => void;
}

export default function SkipOnboardingButton({ disabled, onSkip }: SkipOnboardingButtonProps) {
  const { t } = useTranslation('common');

  return (
    <div className="mt-8 text-center">
      <button
        onClick={onSkip}
        disabled={disabled}
        className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300 disabled:opacity-50"
      >
        {disabled ? t('Skipping...') : t('Skip for now')}
      </button>
    </div>
  );
}
