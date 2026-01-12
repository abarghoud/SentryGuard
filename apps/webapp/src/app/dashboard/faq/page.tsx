'use client';

import { useTranslation } from 'react-i18next';
import FAQContent from '../../../components/faq/FAQContent';

export default function FAQDashboardPage() {
  const { t } = useTranslation('common');

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {t('Frequently Asked Questions')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          {t('Find answers to common questions about SentryGuard')}
        </p>
      </div>

      <FAQContent />
    </div>
  );
}