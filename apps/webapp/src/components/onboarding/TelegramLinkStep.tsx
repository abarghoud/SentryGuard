'use client';

import { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTelegram } from '../../lib/useTelegram';
import TelegramLinkCard from '../TelegramLinkCard';
import OnboardingStepLayout from './OnboardingStepLayout';

interface TelegramLinkStepProps {
  onContinue?: () => void;
}

export default function TelegramLinkStep({ onContinue }: TelegramLinkStepProps) {
  const { t } = useTranslation('common');
  const { status, linkInfo, generateLink, unlink, sendTest, fetchStatus } = useTelegram();
  const [hasOpenedTelegram, setHasOpenedTelegram] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const isLinked = status?.linked === true;

  const handleVisibilityChange = useCallback(async () => {
    if (!document.hidden && hasOpenedTelegram && !isLinked) {
      await fetchStatus();
    }
  }, [hasOpenedTelegram, isLinked, fetchStatus]);

  useEffect(() => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  const handleLinkClick = useCallback(() => {
    setHasOpenedTelegram(true);
  }, []);

  const handleCheckStatus = useCallback(async () => {
    setIsChecking(true);
    try {
      await fetchStatus();
    } finally {
      setIsChecking(false);
    }
  }, [fetchStatus]);

  const handleContinue = useCallback(() => {
    if (onContinue) {
      onContinue();
    }
  }, [onContinue]);

  return (
    <OnboardingStepLayout
      title={t('Link Your Telegram Account')}
      description={t('You will receive instant alerts when suspicious activity is detected')}
      stepNumber={1}
      totalSteps={4}
    >
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            {t('💡 You are about to open Telegram. Once you\'ve linked your account, return to SentryGuard to continue.')}
          </p>
        </div>

        <div onClick={handleLinkClick}>
          <TelegramLinkCard
            status={status}
            linkInfo={linkInfo}
            onGenerateLink={generateLink}
            onUnlink={unlink}
            onSendTest={sendTest}
            onRefresh={fetchStatus}
          />
        </div>

        {isLinked ? (
          <div className="space-y-4">
            <button
              onClick={handleContinue}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
            >
              {t('Continue to Next Step')}
            </button>
          </div>
        ) : (
          <>
            {hasOpenedTelegram && (
              <button
                onClick={handleCheckStatus}
                disabled={isChecking}
                className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed"
              >
                {isChecking ? t('Checking...') : t('I\'ve linked my Telegram')}
              </button>
            )}

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-sm text-gray-600 dark:text-gray-300">
              <p className="font-medium mb-2">{t('How it works:')}</p>
              <ol className="list-decimal list-inside space-y-1">
                <li>{t('Click "Generate Telegram Link"')}</li>
                <li>{t('Click the link to open Telegram')}</li>
                <li>{t('The bot will automatically link your account')}</li>
                <li>{t('Return here and continue')}</li>
              </ol>
            </div>
          </>
        )}
      </div>
    </OnboardingStepLayout>
  );
}
