import { SupportersData } from './buymeacoffee.types';

function resolveApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
}

function fallbackEmptySupporters(): SupportersData {
  return {
    subscribers: [],
    supporters: [],
    totalCoffeesCount: 0,
    hasActiveSupporters: false,
  };
}

export async function getSupportersData(): Promise<SupportersData> {
  try {
    const apiUrl = resolveApiUrl();
    const res = await fetch(`${apiUrl}/supporters`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) {
      return fallbackEmptySupporters();
    }
    const data = (await res.json()) as SupportersData;
    return {
      subscribers: data.subscribers || [],
      supporters: data.supporters || [],
      totalCoffeesCount: data.totalCoffeesCount || 0,
      hasActiveSupporters: Boolean(data.hasActiveSupporters),
    };
  } catch {
    return fallbackEmptySupporters();
  }
}
