import './global.css';
import type { Metadata } from 'next';
import Script from 'next/script';

import { Provider as RollbarProvider } from '@rollbar/react';

import I18nProvider from '../components/I18nProvider';
import BuyMeACoffeeWidget from '../components/BuyMeACoffeeWidget';
import { clientConfig } from '@/logger/rollbar.config';

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
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RollbarProvider config={clientConfig}>
      <html lang="en" suppressHydrationWarning>
        <head>
          <script
            src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
            data-name="BMC-Widget"
            data-cfasync="false"
            data-id="sentryguardorg"
            data-description="Support me on Buy me a coffee!"
            data-message="SentryGuard depends on donations to operate. Your support keeps us running! ☕"
            data-color="#b91c1c"
            data-position="Right"
            data-x_margin="18"
            data-y_margin="18"
          />
          <Script
            id="crisp-widget"
            strategy="beforeInteractive"
          >
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
        </head>
        <body>
          <I18nProvider>{children}</I18nProvider>
          <BuyMeACoffeeWidget />
        </body>
      </html>
    </RollbarProvider>
  );
}
