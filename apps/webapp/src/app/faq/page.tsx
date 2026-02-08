import type { Metadata } from 'next';
import {
  getLocale,
  getTranslation,
  renderRichTranslation,
  stripRichTextTags,
} from '../../lib/server-i18n';
import { faqCategories } from '../../lib/faq-data';
import PublicLayout from '../../components/PublicLayout';
import { ContactSection } from '../../components/faq/ContactSection';

export const metadata: Metadata = {
  title: 'FAQ - SentryGuard',
  description:
    'Frequently asked questions about SentryGuard. Learn how to protect your Tesla with real-time Sentry Mode monitoring and Telegram alerts.',
  keywords: [
    'SentryGuard FAQ',
    'Tesla Sentry Mode',
    'Tesla Security',
    'Telegram Alerts',
    'Tesla Monitoring Help',
  ],
  openGraph: {
    title: 'FAQ - SentryGuard',
    description:
      'Frequently asked questions about SentryGuard Tesla monitoring.',
    type: 'website',
  },
};

function generateFaqJsonLd(t: (key: string) => string) {
  const questions = faqCategories.flatMap((category) =>
    category.items.map((item) => ({
      '@type': 'Question',
      name: t(item.questionKey),
      acceptedAnswer: {
        '@type': 'Answer',
        text: stripRichTextTags(t(item.answerKey)),
      },
    }))
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions,
  };
}

export default async function FAQPage() {
  const locale = await getLocale();
  const t = getTranslation(locale);
  const jsonLd = generateFaqJsonLd(t);

  return (
    <PublicLayout
      locale={locale}
      navigationItems={[
        {
          label: '← Back to home',
          href: '/',
          primary: false,
        },
      ]}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

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

          <div className="space-y-6">
            {faqCategories.map((category, categoryIndex) => (
              <div
                key={categoryIndex}
                className="rounded-2xl shadow-sm border overflow-hidden bg-white border-gray-200"
              >
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {t(category.titleKey)}
                  </h3>
                </div>
                <div className="divide-y divide-gray-200">
                  {category.items.map((item, itemIndex) => (
                    <details
                      key={itemIndex}
                      className="group transition-all duration-200 hover:bg-gray-50"
                    >
                      <summary className="w-full px-6 py-5 text-left flex items-start justify-between gap-4 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                        <span className="text-base font-medium flex-1 text-left text-gray-900">
                          {t(item.questionKey)}
                        </span>
                        <svg
                          className="w-5 h-5 flex-shrink-0 transition-all duration-300 mt-0.5 text-gray-400 group-open:rotate-180 group-open:text-red-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                          />
                        </svg>
                      </summary>
                      <div className="px-6 pb-5 pt-0">
                        <p className="leading-relaxed text-sm text-gray-600">
                          {item.answerLinks
                            ? renderRichTranslation(
                                t(item.answerKey),
                                item.answerLinks
                              )
                            : t(item.answerKey)}
                        </p>
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <ContactSection />
        </div>
      </div>
    </PublicLayout>
  );
}
