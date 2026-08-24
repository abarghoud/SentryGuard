import type { Metadata } from 'next';
import {
  getTranslation,
  renderRichTranslation,
  stripRichTextTags,
} from '@/core/i18n/server-i18n';
import { SUPPORTED_LOCALES } from '@/core/i18n/i18n-config';
import {
  faqCategories,
} from '@/core/faq/faq-data';
import {
  getFaqCategorySlug,
  getFaqItemSlug,
} from '@/core/faq/faq.helper';
import PublicLayout from '@/components/PublicLayout';
import { ContactSection } from '@/components/faq/ContactSection';
import { PublicFaqList } from '@/components/faq/PublicFaqList';

export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface FaqPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: FaqPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslation(locale);

  return {
    title: t('meta.faq.title'),
    description: t('meta.faq.description'),
    keywords: [
      'SentryGuard FAQ',
      'Tesla Sentry Mode',
      'Tesla Security',
      'Telegram Alerts',
      'Tesla Monitoring Help',
    ],
    openGraph: {
      title: t('meta.faq.title'),
      description: t('meta.faq.ogDescription'),
      type: 'website',
    },
    alternates: {
      canonical: `/${locale}/faq`,
      languages: {
        'en': '/en/faq',
        'fr': '/fr/faq',
        'x-default': '/en/faq',
      },
    },
  };
}

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

export default async function FAQPage({ params }: FaqPageProps) {
  const { locale } = await params;
  const t = getTranslation(locale);
  const jsonLd = generateFaqJsonLd(t);

  const categories = faqCategories.map((category) => ({
    id: getFaqCategorySlug(category),
    title: t(category.titleKey),
    items: category.items.map((item) => ({
      id: getFaqItemSlug(item),
      question: t(item.questionKey),
      answer: item.answerLinks
        ? renderRichTranslation(t(item.answerKey), item.answerLinks)
        : t(item.answerKey),
    })),
  }));

  return (
    <PublicLayout
      locale={locale}
      navigationItems={[
        {
          label: '← Back to home',
          href: `/${locale}`,
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

          <PublicFaqList
            categories={categories}
            copyLinkText={t('Copy link')}
            copiedText={t('Copied!')}
          />

          <ContactSection />
        </div>
      </div>
    </PublicLayout>
  );
}
