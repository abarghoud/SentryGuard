import { NextRequest, NextResponse } from 'next/server';
import { DEFAULT_LOCALE, SUPPORTED_LOCALES } from '@/lib/i18n-config';

function detectLocale(request: NextRequest): string {
  const localeCookie = request.cookies.get('locale')?.value;

  if (localeCookie && (SUPPORTED_LOCALES as readonly string[]).includes(localeCookie)) {
    return localeCookie;
  }

  const acceptLanguage = request.headers.get('accept-language') || '';

  if (acceptLanguage.toLowerCase().startsWith('fr')) {
    return 'fr';
  }

  return DEFAULT_LOCALE;
}

function extractLocaleFromPath(pathname: string): string | undefined {
  return SUPPORTED_LOCALES.find(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const urlLocale = extractLocaleFromPath(pathname);

  if (urlLocale) {
    request.cookies.set('locale', urlLocale);

    const response = NextResponse.next({
      request: { headers: request.headers },
    });

    response.cookies.set('locale', urlLocale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60,
      sameSite: 'lax',
    });

    return response;
  }

  const locale = detectLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`;

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/', '/faq', '/en', '/fr', '/en/faq', '/fr/faq'],
};
