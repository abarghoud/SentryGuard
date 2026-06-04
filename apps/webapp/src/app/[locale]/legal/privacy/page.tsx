import type { Metadata } from 'next';

import { SUPPORTED_LOCALES } from '@/core/i18n/i18n-config';
import { privacyPolicy, resolveLegalLocale } from '@/core/legal/legal-content';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import PublicLayout from '@/components/PublicLayout';

export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface PrivacyPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: PrivacyPageProps): Promise<Metadata> {
  const { locale } = await params;
  const doc = privacyPolicy[resolveLegalLocale(locale)];

  return {
    title: `${doc.title} — SentryGuard`,
    description: doc.intro,
    alternates: {
      canonical: `/${locale}/legal/privacy`,
      languages: {
        en: '/en/legal/privacy',
        fr: '/fr/legal/privacy',
        'x-default': '/en/legal/privacy',
      },
    },
  };
}

export default async function PrivacyPage({ params }: PrivacyPageProps) {
  const { locale } = await params;
  const legalLocale = resolveLegalLocale(locale);
  const updatedLabel = legalLocale === 'fr' ? 'Dernière mise à jour' : 'Last updated';

  return (
    <PublicLayout
      locale={locale}
      navigationItems={[{ label: '← Back to home', href: `/${locale}`, primary: false }]}
    >
      <LegalDocumentView document={privacyPolicy[legalLocale]} updatedLabel={updatedLabel} />
    </PublicLayout>
  );
}
