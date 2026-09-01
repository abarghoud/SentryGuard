import type { Metadata } from 'next';
import { SUPPORTED_LOCALES } from '@/core/i18n/i18n-config';
import { getTranslation } from '@/core/i18n/server-i18n';
import { getSupportersData } from '@/core/buymeacoffee/buymeacoffee.service';
import PublicLayout from '@/components/PublicLayout';
import { SupporterCard } from '@/components/supporters/SupporterCard';
import { InfrastructureCostBanner } from '@/components/supporters/InfrastructureCostBanner';
import { EmptySupportersState } from '@/components/supporters/EmptySupportersState';

export const dynamicParams = false;
export const revalidate = 60;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface SupportersPageProps {
  params: Promise<{ locale: string }>;
}

const BMC_URL = 'https://buymeacoffee.com/sentryguardorg';

export async function generateMetadata({
  params,
}: SupportersPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslation(locale);

  return {
    title: t('meta.supporters.title'),
    description: t('meta.supporters.description'),
    robots: {
      index: false,
      follow: true,
    },
    openGraph: {
      title: t('meta.supporters.title'),
      description: t('meta.supporters.ogDescription'),
      type: 'website',
    },
    alternates: {
      canonical: `/${locale}/supporters`,
      languages: {
        en: '/en/supporters',
        fr: '/fr/supporters',
        'x-default': '/en/supporters',
      },
    },
  };
}

export default async function SupportersPage({ params }: SupportersPageProps) {
  const { locale } = await params;
  const t = getTranslation(locale);
  const data = await getSupportersData();

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
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-semibold uppercase tracking-wider mb-4 border border-red-100">
            <span>❤️</span>
            <span>{t('Community & Backers')}</span>
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight sm:text-5xl mb-4">
            {t('Our Supporters & Contributors')}
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            {t(
              'SentryGuard is an independent open-source project. A massive thank you to everyone helping keep this service running and free for the community.'
            )}
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href={BMC_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <span>☕</span>
              <span>{t('Support on Buy Me a Coffee')}</span>
            </a>
            <a
              href="https://github.com/abarghoud/SentryGuard"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-gray-900 hover:bg-gray-800 text-white font-medium shadow-md hover:shadow-lg transition-all duration-200"
            >
              <span>⭐</span>
              <span>{t('Star on GitHub')}</span>
            </a>
          </div>
        </div>

        <div className="space-y-12 mb-16">
          {data.supporters.length > 0 ? (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center font-bold">
                  ☕
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">
                    {t('Community Backers & Contributors')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('People who support SentryGuard through donations and monthly memberships')}
                  </p>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.supporters.map((supporter) => (
                  <SupporterCard key={supporter.id} supporter={supporter} locale={locale} />
                ))}
              </div>
            </div>
          ) : null}

          {!data.hasActiveSupporters ? (
            <EmptySupportersState
              title={t('Be the first supporter!')}
              description={t(
                'Help fund our infrastructure costs and your name or message will appear right here on our supporters wall.'
              )}
              ctaText={t('Buy us a coffee')}
              bmcUrl={BMC_URL}
            />
          ) : null}

          <InfrastructureCostBanner
            title={t('How your support makes a difference')}
            description={t(
              'Every contribution directly covers server and network infrastructure costs, allowing SentryGuard to stay completely free, ad-free and privacy-friendly for all Tesla owners.'
            )}
            telemetryTitle={t('Tesla Fleet Telemetry')}
            telemetryDesc={t(
              'Real-time TLS ingestion servers that monitor your vehicle mode without draining battery.'
            )}
            notificationsTitle={t('Instant Push Alerts')}
            notificationsDesc={t(
              'High-availability notification delivery through Expo Push and Telegram within milliseconds.'
            )}
            openSourceTitle={t('100% Open-Source & Private')}
            openSourceDesc={t(
              'No advertising, no data resale, zero telemetry tracking of your trips or personal data.'
            )}
          />

          <div className="text-center max-w-2xl mx-auto py-6 px-4 rounded-2xl bg-gray-50 border border-gray-200/80">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">
              🔒 {t('Privacy & Display Preferences')}
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed">
              {t(
                "Want to update your display name or hide your contribution from our public wall? Contact us at hello@sentryguard.org and we'll take care of it immediately."
              )}
            </p>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
