import { TypeSafeClient } from '@typesafe-ai/sdk';

let cachedApiKey: string | undefined;
let cachedClient: TypeSafeClient | null = null;

export function getTypeSafeClient(): TypeSafeClient | null {
  const apiKey = process.env.TYPESAFE_API_KEY;

  if (apiKey !== cachedApiKey) {
    cachedApiKey = apiKey;
    cachedClient = apiKey ? new TypeSafeClient() : null;
  }

  return cachedClient;
}
