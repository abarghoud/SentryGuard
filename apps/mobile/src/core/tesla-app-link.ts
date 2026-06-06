import * as Linking from 'expo-linking';

const TESLA_APP_URL = 'tesla://';

export async function openTeslaApp(fallbackUrl: string): Promise<void> {
  if (await tryOpenUrl(TESLA_APP_URL)) {
    return;
  }

  await tryOpenUrl(buildFallbackUrl(fallbackUrl));
}

async function tryOpenUrl(url: string): Promise<boolean> {
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}

export function buildFallbackUrl(fallbackUrl: string): string {
  try {
    const url = new URL(fallbackUrl);
    url.searchParams.set('skipDeepLink', 'true');
    return url.toString();
  } catch {
    return fallbackUrl;
  }
}
