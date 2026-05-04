import type { Metadata } from 'next';
import { getTranslation } from '@/core/i18n/server-i18n';
import { SUPPORTED_LOCALES } from '@/core/i18n/i18n-config';
import PublicLayout from '@/components/PublicLayout';
import AuthRedirect from '@/components/AuthRedirect';
import TeslaLoginButton from '@/components/TeslaLoginButton';
import SessionExpiredBanner from '@/components/SessionExpiredBanner';
import Image from 'next/image';

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

      {/* Hero Section Split */}
      <div className="container mx-auto px-6 py-12 md:py-20 lg:py-24">
        <SessionExpiredBanner />
        
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <h2 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-500 via-red-600 to-red-700 text-transparent bg-clip-text p-1 leading-tight">
              {t('Never miss a door ding again.')}
            </h2>
            <p className="text-xl md:text-2xl text-gray-700 mb-8">
              {t('Get instant Telegram alerts the second your Tesla detects a threat. Zero battery drain.')}
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
            <Image src="/images/hero-alert.png" alt="Telegram Sentry Alert" width={600} height={600} className="w-full h-auto object-cover transform hover:scale-105 transition-transform duration-700" />
          </div>
        </div>
      </div>

      {/* The Problem / Solution Section */}
      <div className="bg-gray-50 py-16 md:py-24 border-y border-gray-200">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">{t('The Tesla App is not enough.')}</h3>
            <p className="text-lg text-gray-600">
              {t("The official app only alerts you for direct threats like alarms. For everything else—like door dings or scratches—you're left in the dark until you check your car.")}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
            <div className="order-2 md:order-1 relative rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white">
               <Image src="/images/door-ding.png" alt="Door ding comparison" width={600} height={600} className="w-full h-auto object-cover" />
            </div>
            <div className="order-1 md:order-2 space-y-10">
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                  <span className="text-red-600 text-xl">❌</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">{t('Without SentryGuard')}</h4>
                  <p className="text-gray-600 leading-relaxed">{t('A shopping cart hits your car. The alarm doesn\'t trigger. The Tesla app stays silent. You find out too late.')}</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 text-xl">✅</span>
                </div>
                <div>
                  <h4 className="text-xl font-semibold mb-2">{t('With SentryGuard')}</h4>
                  <p className="text-gray-600 leading-relaxed">{t('Sentry Mode records the event. SentryGuard instantly pushes a Telegram alert to your phone. You can react immediately.')}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How it works 3 steps */}
      <div className="container mx-auto px-6 py-20 md:py-24">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">{t('How it works')}</h3>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
          {/* Connecting line for desktop */}
          <div className="hidden md:block absolute top-10 left-[16%] right-[16%] h-1 bg-gradient-to-r from-red-100 via-red-300 to-red-100 -z-10 rounded-full"></div>
          
          <div className="bg-white rounded-xl p-8 text-center relative hover:-translate-y-2 transition-transform duration-300">
            <div className="w-20 h-20 bg-white border-4 border-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md text-3xl">
              🚗
            </div>
            <h4 className="text-xl font-semibold mb-3">{t('1. Connect your Tesla')}</h4>
            <p className="text-gray-600">
              {t('Securely link your vehicle using official Tesla OAuth. We never see your password.')}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-8 text-center relative hover:-translate-y-2 transition-transform duration-300">
            <div className="w-20 h-20 bg-white border-4 border-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md text-3xl">
              ⚡
            </div>
            <h4 className="text-xl font-semibold mb-3">{t('2. Smart Telemetry')}</h4>
            <p className="text-gray-600">
              {t('Our servers listen to the official telemetry stream. Zero polling means absolutely zero battery drain.')}
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-8 text-center relative hover:-translate-y-2 transition-transform duration-300">
            <div className="w-20 h-20 bg-white border-4 border-red-50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-md text-3xl">
              📱
            </div>
            <h4 className="text-xl font-semibold mb-3">{t('3. Instant Alerts')}</h4>
            <p className="text-gray-600">
              {t('Connect our Telegram bot and receive push notifications the exact second Sentry Mode is triggered.')}
            </p>
          </div>
        </div>
      </div>

      {/* Support section - simplified and positive */}
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
