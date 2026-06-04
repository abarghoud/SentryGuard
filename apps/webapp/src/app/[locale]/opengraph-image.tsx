import { ImageResponse } from 'next/og';

export const alt = 'SentryGuard — Protect your Tesla';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

interface OgImageProps {
  params: Promise<{ locale: string }>;
}

export default async function OpengraphImage({ params }: OgImageProps) {
  const { locale } = await params;
  const tagline =
    locale === 'fr'
      ? 'Surveillance temps réel et alertes pour votre Tesla'
      : 'Real-time monitoring and alerts for your Tesla';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #111827 0%, #7f1d1d 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: 26,
              background: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 54,
              fontWeight: 800,
            }}
          >
            SG
          </div>
          <div style={{ fontSize: 88, fontWeight: 800, letterSpacing: -2 }}>SentryGuard</div>
        </div>
        <div style={{ marginTop: 32, fontSize: 38, opacity: 0.92 }}>{tagline}</div>
      </div>
    ),
    { ...size }
  );
}
