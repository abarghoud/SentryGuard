import { useState, useEffect, useCallback } from 'react';

export interface RuntimeConfig {
  apiUrl: string;
  virtualKeyUrl: string;
}

let cachedConfig: RuntimeConfig | null = null;
let fetchingPromise: Promise<RuntimeConfig> | null = null;

async function fetchRuntimeConfig(): Promise<RuntimeConfig> {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (fetchingPromise) {
    return fetchingPromise;
  }

  fetchingPromise = fetch('/api/runtime-config')
    .then((res) => {
      if (!res.ok) {
        throw new Error('Failed to fetch runtime config');
      }
      return res.json();
    })
    .then((config: RuntimeConfig) => {
      cachedConfig = config;
      return config;
    })
    .finally(() => {
      fetchingPromise = null;
    });

  return fetchingPromise;
}

export function useRuntimeConfig() {
  const [config, setConfig] = useState<RuntimeConfig | null>(cachedConfig);
  const [loading, setLoading] = useState(!cachedConfig);
  const [error, setError] = useState<Error | null>(null);

  const loadConfig = useCallback(async () => {
    if (cachedConfig) {
      setConfig(cachedConfig);
      setLoading(false);
      return;
    }

    try {
      const newConfig = await fetchRuntimeConfig();
      setConfig(newConfig);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  return { config, loading, error, reload: loadConfig };
}