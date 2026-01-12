'use client';

import { useTranslation } from 'react-i18next';
import Layout from '../../components/Layout';
import FAQContent from '../../components/faq/FAQContent';

export default function FAQPage() {
  const { t } = useTranslation('common');

  return (
    <Layout
      navigationItems={[
        {
          label: '← Back to home',
          href: '/',
          primary: false
        }
      ]}
    >
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-600 via-red-600 to-red-700 text-transparent bg-clip-text">
              {t('Frequently Asked Questions')}
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              {t('Find answers to common questions about SentryGuard')}
            </p>
          </div>

          <FAQContent />
        </div>
      </div>
    </Layout>
  );
}
