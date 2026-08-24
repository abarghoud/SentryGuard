'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLoginUrlUseCase } from '../features/auth/di';

interface TeslaLoginButtonProps {
  variant?: 'primary' | 'secondary';
}

export default function TeslaLoginButton({
  variant = 'primary',
}: TeslaLoginButtonProps) {
  const { t } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { url } = await getLoginUrlUseCase.execute();
      // Rediriger vers Tesla OAuth
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('Failed to initiate login')
      );
      setIsLoading(false);
    }
  };

  const isPrimary = variant === 'primary';

  const buttonStyles = isPrimary
    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl py-4 px-8 rounded-lg transform hover:scale-105'
    : 'text-red-600 hover:text-red-700 underline-offset-4 hover:underline py-1';

  const label = isLoading ? t('Connecting...') : t('Login with Tesla');

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className={`flex items-center gap-3 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${buttonStyles}`}
      >
        <img
          src={isPrimary ? '/tesla-logo.svg' : '/tesla-logo-red.svg'}
          alt="SentryGuard Logo"
          className={isPrimary ? 'w-8 h-8' : 'w-5 h-5'}
        />
        <span>{label}</span>
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
