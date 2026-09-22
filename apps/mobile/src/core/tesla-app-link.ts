import * as Linking from 'expo-linking';

import { resolveTeslaCameraUrl } from './tesla-camera-link';

const TESLA_APP_URL = 'tesla://';

export async function openTeslaApp(fallbackUrl: string, vin?: string): Promise<void> {
  if (await tryOpenCameraView(vin)) {
    return;
  }

  if (await tryOpenUrl(TESLA_APP_URL)) {
    return;
  }

  await tryOpenUrl(buildFallbackUrl(fallbackUrl));
}

async function tryOpenCameraView(vin?: string): Promise<boolean> {
  const cameraUrl = resolveTeslaCameraUrl(vin);

  return cameraUrl !== null && (await tryOpenUrl(cameraUrl));
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
