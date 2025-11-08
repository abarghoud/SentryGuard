import './global.css';
import type { Metadata } from 'next';
import I18nProvider from '../components/I18nProvider';
import BuyMeACoffeeWidget from '../components/BuyMeACoffeeWidget';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          data-name="BMC-Widget"
          data-cfasync="false"
          src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js"
          data-id="sentryguardorg"
          data-description="Support me on Buy me a coffee!"
          data-message="SentryGuard depends on donations to operate. Your support keeps us running! ☕"
          data-color="#b91c1c"
          data-position="Right"
          data-x_margin="18"
          data-y_margin="18"
        ></script>
      </head>
      <body suppressHydrationWarning>
        <I18nProvider>{children}</I18nProvider>
        <BuyMeACoffeeWidget />
      </body>
    </html>
  );
}
