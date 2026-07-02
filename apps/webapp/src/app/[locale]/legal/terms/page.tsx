import type { Metadata } from 'next';

import { SUPPORTED_LOCALES } from '@/core/i18n/i18n-config';
import { termsOfService, resolveLegalLocale } from '@/core/legal/legal-content';
import { LegalDocumentView } from '@/components/legal/LegalDocumentView';
import PublicLayout from '@/components/PublicLayout';

export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface TermsPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: TermsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const doc = termsOfService[resolveLegalLocale(locale)];

  return {
    title: `${doc.title} — SentryGuard`,
    description: doc.intro,
    alternates: {
      canonical: `/${locale}/legal/terms`,
      languages: {
        en: '/en/legal/terms',
        fr: '/fr/legal/terms',
        'x-default': '/en/legal/terms',
      },
    },
  };
}

export default async function TermsPage({ params }: TermsPageProps) {
  const { locale } = await params;
  const legalLocale = resolveLegalLocale(locale);
  const updatedLabel = legalLocale === 'fr' ? 'Dernière mise à jour' : 'Last updated';

  return (
    <PublicLayout
      locale={locale}
      navigationItems={[{ label: '← Back to home', href: `/${locale}`, primary: false }]}
    >
      <LegalDocumentView document={termsOfService[legalLocale]} updatedLabel={updatedLabel} />
    </PublicLayout>
  );
}
