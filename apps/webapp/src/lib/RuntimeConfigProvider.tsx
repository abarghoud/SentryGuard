'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { RuntimeConfig } from './useRuntimeConfig';

interface RuntimeConfigContextValue {
  config: RuntimeConfig | null;
  isReady: boolean;
}

const RuntimeConfigContext = createContext<RuntimeConfigContextValue>({
  config: null,
  isReady: false,
});

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<RuntimeConfig | null>(() => {
    if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
      return window.__RUNTIME_CONFIG__;
    }
    return null;
  });
  const [isReady, setIsReady] = useState(!!config);

  useEffect(() => {
    if (config) {
      window.__RUNTIME_CONFIG__ = config;
      setIsReady(true);
      return;
    }

    fetch('/api/runtime-config')
      .then((res) => res.json())
      .then((data: RuntimeConfig) => {
        window.__RUNTIME_CONFIG__ = data;
        setConfig(data);
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Failed to load runtime config:', err);
        setIsReady(true);
      });
  }, [config]);

  return (
    <RuntimeConfigContext.Provider value={{ config, isReady }}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfigContext() {
  return useContext(RuntimeConfigContext);
}

export function getRuntimeConfig(): RuntimeConfig | null {
  if (typeof window !== 'undefined') {
    return window.__RUNTIME_CONFIG__ || null;
  }
  return null;
}