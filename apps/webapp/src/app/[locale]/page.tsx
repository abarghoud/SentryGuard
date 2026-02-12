import type { Metadata } from 'next';
import { getTranslation } from '@/lib/server-i18n';
import { SUPPORTED_LOCALES } from '@/lib/i18n-config';
import PublicLayout from '@/components/PublicLayout';
import AuthRedirect from '@/components/AuthRedirect';
import TeslaLoginButton from '@/components/TeslaLoginButton';
import SessionExpiredBanner from '@/components/SessionExpiredBanner';

export const dynamicParams = false;

export function generateStaticParams() {
  return SUPPORTED_LOCALES.map((locale) => ({ locale }));
}

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({
  params,
}: HomePageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = getTranslation(locale);

  return {
    title: t('meta.home.title'),
    description: t('meta.home.description'),
    keywords: [
      'Tesla',
      'Sentry Mode',
      'Security',
      'Vehicle Monitoring',
      'Telegram Alerts',
      'Tesla Protection',
      'Tesla Sentry Mode Alerts',
    ],
    openGraph: {
      title: t('meta.home.title'),
      description: t('meta.home.ogDescription'),
      type: 'website',
    },
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'en': '/en',
        'fr': '/fr',
        'x-default': '/en',
      },
    },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = getTranslation(locale);

  return (
    <PublicLayout
      locale={locale}
      navigationItems={[
        {
          label: 'FAQ',
          href: `/${locale}/faq`,
          icon: (
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
          primary: true,
        },
      ]}
    >
      <AuthRedirect />

      <div className="container mx-auto px-6 py-20">
        <SessionExpiredBanner />

        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-transparent bg-clip-text p-1">
            {t('Protect Your Tesla')}
          </h2>
          <p className="text-xl md:text-2xl text-gray-700 mb-8">
            {t(
              'Real-time monitoring and instant alerts for your Tesla vehicle'
            )}
          </p>
          <p className="text-lg text-gray-600 mb-12 max-w-2xl mx-auto">
            {t(
              'Telemetry monitors Sentry Mode and sends alerts without draining battery'
            )}
          </p>

          <TeslaLoginButton />

          <p className="text-sm text-gray-600 mt-6">
            {t('Secure OAuth authentication powered by Tesla')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="bg-white rounded-xl p-6 border border-gray-300 hover:border-red-600 transition-colors duration-300">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {t('Instant Alerts')}
            </h3>
            <p className="text-gray-600">
              {t(
                "Receive real-time Telegram notifications when your vehicle's Sentry Mode is triggered."
              )}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-300 hover:border-red-600 transition-colors duration-300">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {t('Battery-Efficient Monitoring')}
            </h3>
            <p className="text-gray-600">
              {t(
                'Monitor Sentry Mode via telemetry without battery drain'
              )}
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 border border-gray-300 hover:border-red-600 transition-colors duration-300">
            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center mb-4">
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {t('Secure & Private')}
            </h3>
            <p className="text-gray-600">
              {t(
                "End-to-end encrypted communication with Tesla's official API. Your data stays yours."
              )}
            </p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-semibold mb-4 text-gray-600">
            {t('Support SentryGuard')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t(
              'SentryGuard is a non-profit, open-source project built by the community for Tesla owners. It depends on donations to cover server and development costs.'
            )}
          </p>
          <p className="text-gray-600 text-sm mb-6">
            {t(
              'If donations no longer cover expenses, the service may shut down, become paid (at actual cost, around $0.50/user), or be limited to current users. Your support keeps it free and open!'
            )}
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
