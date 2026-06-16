import * as Linking from 'expo-linking';

export function extractTokenFromCallbackUrl(callbackUrl: string): string | null {
  const parsedUrl = Linking.parse(callbackUrl);
  const token = parsedUrl.queryParams?.token;

  if (typeof token === 'string') {
    return token;
  }

  const hashToken = callbackUrl.match(/[#&]token=([^&]+)/)?.[1];
  return hashToken ? decodeURIComponent(hashToken) : null;
}

export function extractMissingScopesFromCallbackUrl(callbackUrl: string): string[] | null {
  const parsedUrl = Linking.parse(callbackUrl);

  if (parsedUrl.queryParams?.error !== 'missing_permissions') {
    return null;
  }

  const missing = parsedUrl.queryParams?.missing;
  if (typeof missing !== 'string' || missing.length === 0) {
    return [];
  }

  return missing.split(',').filter(Boolean);
}
