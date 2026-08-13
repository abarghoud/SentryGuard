import { NextRequest, NextResponse } from 'next/server';
import { proxy } from './locale-proxy';
import { buildCspHeader, isLocaleRoute } from './core/security/csp';

export function middleware(request: NextRequest): NextResponse {
  const response = isLocaleRoute(request.nextUrl.pathname)
    ? proxy(request)
    : NextResponse.next();

  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  const isProduction = process.env.NODE_ENV === 'production';

  response.headers.set('Content-Security-Policy', buildCspHeader(apiUrl, isProduction));

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.[a-zA-Z0-9]+$).*)'],
};
