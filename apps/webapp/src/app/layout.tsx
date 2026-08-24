import './global.css';
import type { Metadata } from 'next';
import Script from 'next/script';

import RuntimeRollbarProvider from '../components/RuntimeRollbarProvider';
import I18nProvider from '../components/I18nProvider';
import BuyMeACoffeeWidget from '../components/BuyMeACoffeeWidget';
import { getLocale } from '../core/i18n/server-i18n';
import { QueryProvider } from '../core/api/query-provider';
import { SITE_URL } from '../core/site';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
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
  const rawCrispId = process.env.NEXT_PUBLIC_CRISP_WEBSITE_ID?.trim();
  const crispWebsiteId =
    rawCrispId && /^[a-zA-Z0-9-]+$/.test(rawCrispId) ? rawCrispId : null;

  return (
    <RuntimeRollbarProvider>
      <html lang={locale} translate="no">
        <head />
        <body suppressHydrationWarning>
          <QueryProvider>
            <I18nProvider initialLocale={locale}>{children}</I18nProvider>
            <BuyMeACoffeeWidget />
            {crispWebsiteId ? (
              <Script id="crisp-widget" strategy="afterInteractive">
                {`
                  window.$crisp = [];
                  window.CRISP_WEBSITE_ID = "${crispWebsiteId}";
                  (function() {
                    d = document;
                    s = d.createElement("script");
                    s.src = "https://client.crisp.chat/l.js";
                    s.async = 1;
                    d.getElementsByTagName("head")[0].appendChild(s);
                  })();
                `}
              </Script>
            ) : null}
          </QueryProvider>
        </body>
      </html>
    </RuntimeRollbarProvider>
  );
}
