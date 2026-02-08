import './global.css';
import type { Metadata } from 'next';
import Script from 'next/script';

import { Provider as RollbarProvider } from '@rollbar/react';

import I18nProvider from '../components/I18nProvider';
import BuyMeACoffeeWidget from '../components/BuyMeACoffeeWidget';
import { clientConfig } from '@/logger/rollbar.config';
import { getLocale } from '../lib/server-i18n';

export const metadata: Metadata = {
  title: 'SentryGuard - Protect Your Tesla',
  description:
    'Monitor and protect your Tesla vehicle with real-time alerts and telemetry',
  keywords: [
    'Tesla',
    'Security',
    'Sentry Mode',
    'Vehicle Monitoring',
    'Telemetry',
  ],
  openGraph: {
    title: 'SentryGuard - Protect Your Tesla',
    description:
      'Monitor and protect your Tesla vehicle with real-time alerts and telemetry',
    type: 'website',
  },
  other: {
    google: 'notranslate',
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  return (
    <RollbarProvider config={clientConfig}>
      <html lang={locale} translate="no">
        <head />
        <body suppressHydrationWarning>
          <I18nProvider initialLocale={locale}>{children}</I18nProvider>
          <BuyMeACoffeeWidget />
          <Script id="crisp-widget" strategy="afterInteractive">
            {`
              window.$crisp = [];
              window.CRISP_WEBSITE_ID = "04ce8de3-dcd5-454b-bd56-66643019ccc0";
              (function() {
                d = document;
                s = d.createElement("script");
                s.src = "https://client.crisp.chat/l.js";
                s.async = 1;
                d.getElementsByTagName("head")[0].appendChild(s);
              })();
            `}
          </Script>
        </body>
      </html>
    </RollbarProvider>
  );
}
