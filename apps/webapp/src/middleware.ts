import { NextRequest, NextResponse } from 'next/server';
import { proxy } from './locale-proxy';

export function middleware(request: NextRequest): NextResponse {
  const response = proxy(request);

  if (response.status >= 300 && response.status < 400) {
    return response;
  }

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const cspHeader = `default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdnjs.buymeacoffee.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://img.buymeacoffee.com; connect-src 'self' ${apiUrl} https://api.tesla.com https://api.rollbar.com; frame-ancestors 'none';`;

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
}

export const config = {
  matcher: ['/', '/faq', '/en', '/fr', '/en/faq', '/fr/faq'],
};
