import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/core/i18n/i18n-config';
import { SITE_URL } from '@/core/site';

const PUBLIC_PATHS = ['', '/faq', '/legal/privacy', '/legal/terms'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return PUBLIC_PATHS.flatMap((path) =>
    SUPPORTED_LOCALES.map((locale) => ({
      url: `${SITE_URL}/${locale}${path}`,
      lastModified,
      changeFrequency: (path === '' ? 'weekly' : 'monthly') as 'weekly' | 'monthly',
      priority: path === '' ? 1 : 0.7,
      alternates: {
        languages: Object.fromEntries(SUPPORTED_LOCALES.map((alt) => [alt, `${SITE_URL}/${alt}${path}`])),
      },
    }))
  );
}
