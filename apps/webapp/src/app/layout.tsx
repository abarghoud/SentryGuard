import './global.css';
import type { Metadata } from 'next';
import I18nProvider from '../components/I18nProvider';

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
      <body suppressHydrationWarning>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
