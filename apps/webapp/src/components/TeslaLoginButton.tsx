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
        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 5.362l2.475-3.026h-4.95L12 5.362zm-2.475 4.07L7.05 6.406 2.475 11.93h7.05v-2.5zm4.95 0v2.5h7.05l-4.575-5.525-2.475 3.025zM12 14.407l2.475 3.025 2.475-3.025H12zm-6.525-2.407L2 19.594h9V12H5.475zm13.05 0H14v7.594h9L19.525 12z" />
        </svg>
        <span>{isLoading ? t('Connecting...') : t('Login with Tesla')}</span>
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </div>
  );
}
