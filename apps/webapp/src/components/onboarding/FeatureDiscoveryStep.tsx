'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useOnboardingQuery } from '../../features/onboarding/di';
import { BreakInOffensiveResponseHeader, BreakInOffensiveResponseContent } from './BreakInOffensiveResponseAnnouncement';

interface FeatureDiscoveryStepProps {
  announcementKey: string;
  onDismissed: () => Promise<void>;
}

interface AnnouncementConfig {
  Header: React.ComponentType;
  Content: React.ComponentType;
}

const ANNOUNCEMENT_CONFIGS: Record<string, AnnouncementConfig> = {
  break_in_offensive_response_v1: {
    Header: BreakInOffensiveResponseHeader,
    Content: BreakInOffensiveResponseContent,
  },
};

export default function FeatureDiscoveryStep({ announcementKey, onDismissed }: FeatureDiscoveryStepProps) {
  const { t } = useTranslation('common');
  const { dismissAnnouncementMutation } = useOnboardingQuery();
  const [isDismissing, setIsDismissing] = useState(false);

  const config = ANNOUNCEMENT_CONFIGS[announcementKey];
  const hasAutoDismissed = useRef(false);

  useEffect(() => {
    if (!config && !hasAutoDismissed.current) {
      hasAutoDismissed.current = true;
      dismissAnnouncementMutation.mutateAsync(announcementKey)
        .then(() => onDismissed())
        .catch((err) => {
          console.error(`Failed to auto-dismiss unknown announcement ${announcementKey}:`, err);
          onDismissed();
        });
    }
  }, [config, announcementKey, dismissAnnouncementMutation, onDismissed]);

  const handleDismiss = async () => {
    setIsDismissing(true);
    try {
      await dismissAnnouncementMutation.mutateAsync(announcementKey);
      await onDismissed();
    } finally {
      setIsDismissing(false);
    }
  };

  if (!config) {
    return null;
  }

  const { Header, Content } = config;

  return (
    <div>
      <Header />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6 sm:p-8 space-y-6">
          <Content />

          <button
            onClick={handleDismiss}
            disabled={isDismissing}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isDismissing ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t('Loading...')}
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {t('Understood, let\'s go!')}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
