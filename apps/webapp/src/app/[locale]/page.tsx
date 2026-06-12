import type { Metadata } from 'next';
import { getTranslation } from '@/core/i18n/server-i18n';
import { SUPPORTED_LOCALES } from '@/core/i18n/i18n-config';
import { SITE_URL } from '@/core/site';
import PublicLayout from '@/components/PublicLayout';
import AuthRedirect from '@/components/AuthRedirect';
import TeslaLoginButton from '@/components/TeslaLoginButton';
import SessionExpiredBanner from '@/components/SessionExpiredBanner';
import LocalizedImage from '@/components/LocalizedImage';
import ComparisonItem from '@/components/home/ComparisonItem';
import StepItem from '@/components/home/StepItem';

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

function buildSoftwareApplicationJsonLd(locale: string, description: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'SentryGuard',
    applicationCategory: 'SecurityApplication',
    operatingSystem: 'iOS, Android, Web',
    url: `${SITE_URL}/${locale}`,
    description,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@type': 'Organization', name: 'SentryGuard', url: SITE_URL },
  };
}

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;
  const t = getTranslation(locale);
  const jsonLd = buildSoftwareApplicationJsonLd(locale, t('meta.home.description'));

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <AuthRedirect />

      <div className="container mx-auto px-6 pt-6 pb-12 md:pt-10 md:pb-20 lg:pt-12 lg:pb-24">
        <SessionExpiredBanner />
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-50 text-red-600 text-sm font-semibold mb-6 border border-red-100 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
              </span>
              {t('Detects break-ins even with Sentry Mode OFF')}
            </div>
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-transparent bg-clip-text p-1 leading-tight">
              {t('The missing security alerts for your Tesla.')}
            </h2>
            <p className="text-xl md:text-2xl text-gray-700 mb-8">
              {t('Get a Telegram notification the second Sentry Mode records a threat, or when someone pulls your door handle—even if you disabled Sentry Mode to save battery.')}
            </p>
            <div className="mb-8 flex flex-col items-start">
               <TeslaLoginButton />
               <p className="text-sm text-gray-500 mt-2 flex items-center">
                 <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                 {t('Secure OAuth authentication powered by Tesla')}
               </p>
            </div>
          </div>
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-gray-100">
            <LocalizedImage baseSrc="/images/hero-alert" locale={locale} alt="Telegram Sentry Alert" width={600} height={600} priority fetchPriority="high" className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700" />
          </div>
        </div>
      </div>

      <div className="bg-gray-50 py-16 md:py-24 border-y border-gray-200 overflow-hidden">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16 md:mb-24">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">{t('Two critical features the Tesla App is missing.')}</h3>
            <p className="text-lg text-gray-600">
              {t('The official app leaves gaps in your security. We fill them with instant Telegram alerts.')}
            </p>
          </div>
          
          <div className="flex flex-col gap-20 md:gap-32 max-w-6xl mx-auto">
            
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-2 md:order-1 relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white">
                 <LocalizedImage baseSrc="/images/door-ding" locale={locale} alt="Door ding comparison" width={600} height={600} className="w-full h-auto object-cover" />
              </div>
              <div className="order-1 md:order-2 space-y-8">
                <div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-semibold mb-4 border border-blue-100">
                    {t('Requires Sentry Mode ON')}
                  </div>
                  <h4 className="text-3xl font-bold mb-4">{t('1. Sentry Mode Alerts')}</h4>
                  <p className="text-lg text-gray-600">{t('Get notified instantly for door dings, scratches, and parking lot accidents.')}</p>
                </div>

                <div className="space-y-6">
                  <ComparisonItem 
                    isPositive={false} 
                    title={t('Tesla App')} 
                    description={t('Stays silent for minor impacts. You only discover the damage when you get back to your car.')} 
                  />
                  <ComparisonItem 
                    isPositive={true} 
                    title={t('SentryGuard')} 
                    description={t('Instantly pushes a Telegram alert the moment Sentry Mode triggers, so you can react immediately.')} 
                  />
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="order-1 md:order-1 space-y-8">
                <div>
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-50 text-purple-600 text-sm font-semibold mb-4 border border-purple-100">
                    {t('Works with Sentry Mode OFF')}
                  </div>
                  <h4 className="text-3xl font-bold mb-4">{t('2. Break-in Detection')}</h4>
                  <p className="text-lg text-gray-600">{t('Alerts you if someone pulls your door handle, even when you\'re saving battery.')}</p>
                </div>

                <div className="space-y-6">
                  <ComparisonItem 
                    isPositive={false} 
                    title={t('Tesla App')} 
                    description={t('If Sentry Mode is off to save battery at home or at night, you get zero notifications if someone tries to break in.')} 
                  />
                  <ComparisonItem 
                    isPositive={true} 
                    title={t('SentryGuard')} 
                    description={t('Uses advanced telemetry to detect handle pulls and alert you instantly, even when Sentry Mode is disabled.')} 
                  />
                </div>
              </div>
              <div className="order-2 md:order-2 relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white">
                 <LocalizedImage baseSrc="/images/hero-alert" locale={locale} alt="Break-in alert comparison" width={600} height={600} className="w-full h-auto object-cover" />
              </div>
            </div>

          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-20 md:py-24">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">{t('How it works')}</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
          <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-1 bg-gradient-to-r from-red-100 via-red-300 to-red-100 -z-10 rounded-full"></div>
          
          <StepItem 
            icon="🚗" 
            title={t('1. Connect your Tesla')} 
            description={t('Securely link your vehicle using official Tesla OAuth. We never see your password.')} 
          />
          <StepItem 
            icon="⚡" 
            title={t('2. Smart Telemetry')} 
            description={t('Our servers listen to the official telemetry stream. Zero polling means absolutely zero battery drain.')} 
          />
          <StepItem 
            icon="📱" 
            title={t('3. Instant Alerts')} 
            description={t('Connect our Telegram bot and receive push notifications the exact second Sentry Mode is triggered.')} 
          />
        </div>
      </div>

      <div className="container mx-auto px-6 py-12 border-t border-gray-100">
        <div className="max-w-3xl mx-auto text-center">
          <h3 className="text-2xl font-semibold mb-4 text-gray-700">
            {t('Support a Community Project')}
          </h3>
          <p className="text-gray-600 mb-4">
            {t(
              'SentryGuard is a 100% free, open-source project built by Tesla owners, for Tesla owners. It is maintained entirely through community donations.'
            )}
          </p>
        </div>
      </div>
    </PublicLayout>
  );
}
