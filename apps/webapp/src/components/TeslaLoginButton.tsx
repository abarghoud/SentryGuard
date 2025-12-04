'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getLoginUrl } from '../lib/api';

export default function TeslaLoginButton() {
  const { t } = useTranslation('common');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { url } = await getLoginUrl();
      // Rediriger vers Tesla OAuth
      window.location.href = url;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('Failed to initiate login')
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={handleLogin}
        disabled={isLoading}
        className="flex items-center gap-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-4 px-8 rounded-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        <img
          src="/tesla-logo.svg"
          alt="SentryGuard Logo"
          className="w-8 h-8"
        />
        <span>{isLoading ? t('Connecting...') : t('Login with Tesla')}</span>
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
