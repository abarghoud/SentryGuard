import './global.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TeslaGuard - Protect Your Tesla',
  description: 'Monitor and protect your Tesla vehicle with real-time alerts and telemetry',
  keywords: ['Tesla', 'Security', 'Sentry Mode', 'Vehicle Monitoring', 'Telemetry'],
  openGraph: {
    title: 'TeslaGuard - Protect Your Tesla',
    description: 'Monitor and protect your Tesla vehicle with real-time alerts and telemetry',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
