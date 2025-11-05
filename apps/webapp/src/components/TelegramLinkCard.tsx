'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { TelegramLinkInfo, TelegramStatus } from '../lib/api';

interface TelegramLinkCardProps {
  status: TelegramStatus | null;
  linkInfo: TelegramLinkInfo | null;
  onGenerateLink: () => Promise<TelegramLinkInfo | null>;
  onUnlink: () => Promise<boolean>;
  onSendTest: () => Promise<boolean>;
  onRefresh: () => Promise<void>;
}

export default function TelegramLinkCard({
  status,
  linkInfo,
  onGenerateLink,
  onUnlink,
  onSendTest,
  onRefresh,
}: TelegramLinkCardProps) {
  const { t } = useTranslation('common');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Auto-refresh status when pending
  useEffect(() => {
    if (status?.status === 'pending' && autoRefresh) {
      const interval = setInterval(() => {
        onRefresh();
      }, 3000); // Check every 3 seconds

      return () => clearInterval(interval);
    }
    return undefined;
  }, [status, autoRefresh, onRefresh]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    await onGenerateLink();
    setAutoRefresh(true);
    setIsGenerating(false);
  };

  const handleUnlink = async () => {
    if (confirm(t('Are you sure you want to unlink your Telegram account?'))) {
      setIsUnlinking(true);
      await onUnlink();
      setAutoRefresh(false);
      setIsUnlinking(false);
    }
  };

  const handleTest = async () => {
    setIsTesting(true);
    const success = await onSendTest();
    setIsTesting(false);
    if (success) {
      alert(t('Test message sent! Check your Telegram.'));
    }
  };

  const handleCopy = () => {
    if (linkInfo?.link) {
      navigator.clipboard.writeText(linkInfo.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isLinked = status?.linked;
  const isPending = status?.status === 'pending';

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <svg
            className="w-8 h-8 text-blue-500"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.562 8.161c-.18 1.897-.962 6.502-1.359 8.627-.168.9-.5 1.201-.82 1.23-.697.064-1.226-.461-1.901-.903-1.056-.693-1.653-1.124-2.678-1.8-1.185-.781-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.015-.15-.056-.212s-.174-.041-.248-.024c-.106.024-1.793 1.139-5.062 3.345-.479.329-.913.489-1.302.481-.428-.009-1.252-.241-1.865-.44-.752-.244-1.349-.374-1.297-.789.027-.216.324-.437.892-.663 3.498-1.524 5.831-2.529 6.998-3.015 3.333-1.386 4.025-1.627 4.477-1.635.099-.001.321.023.465.14.122.099.155.232.171.325.016.093.036.305.02.47z" />
          </svg>
          {t('Telegram Configuration')}
        </h2>
        {isLinked && (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            <svg
              className="w-3 h-3 mr-1"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            {t('Linked')}
          </span>
        )}
      </div>

      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {isLinked
          ? t(
              'Your Telegram account is connected. You will receive alerts here.'
            )
          : t('Link your Telegram account to receive vehicle alerts.')}
      </p>

      {!isLinked && !isPending && (
        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isGenerating ? t('Generating...') : t('Generate Telegram Link')}
        </button>
      )}

      {isPending && linkInfo && (
        <div className="space-y-4">
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              {t('⏳ Waiting for you to click the link and start the bot...')}
            </p>
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {t('This link expires in {{minutes}} minutes', {
                minutes: linkInfo.expires_in_minutes,
              })}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('Your Telegram Link')}:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={linkInfo.link}
                readOnly
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
              />
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors duration-200 text-sm font-medium"
              >
                {copied ? t('Copied!') : t('Copy')}
              </button>
            </div>
          </div>

          <a
            href={linkInfo.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 text-center"
          >
            {t('Open in Telegram')}
          </a>
        </div>
      )}

      {isLinked && (
        <div className="space-y-3">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <p className="text-sm text-green-800 dark:text-green-200">
              {t('✅ Your Telegram account is successfully linked!')}
            </p>
            {status.linked_at && (
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {t('Linked on {{date}}', {
                  date: new Date(status.linked_at).toLocaleString(),
                })}
              </p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleTest}
              disabled={isTesting}
              className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isTesting ? t('Sending...') : t('Send Test Message')}
            </button>
            <button
              onClick={handleUnlink}
              disabled={isUnlinking}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              {isUnlinking ? t('Unlinking...') : t('Unlink')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
