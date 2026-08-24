export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://sentryguard.org').replace(/\/$/, '');

export interface AppStoreUrls {
  appStoreUrl?: string;
  googlePlayUrl?: string;
}

export function getAppStoreUrls(): AppStoreUrls {
  const appStoreUrl = process.env.NEXT_PUBLIC_APP_STORE_URL?.replace(/\/$/, '');
  const googlePlayUrl = process.env.NEXT_PUBLIC_GOOGLE_PLAY_URL?.replace(/\/$/, '');

  return {
    ...(appStoreUrl ? { appStoreUrl } : {}),
    ...(googlePlayUrl ? { googlePlayUrl } : {}),
  };
}
