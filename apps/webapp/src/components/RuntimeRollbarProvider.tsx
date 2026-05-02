'use client';

import { useEffect, useState } from 'react';
import { Provider as RollbarProvider } from '@rollbar/react';
import { resolveRollbarClientToken } from '../core/api/api-client';

interface RuntimeRollbarProviderProps {
  children: React.ReactNode;
}

export default function RuntimeRollbarProvider({ children }: RuntimeRollbarProviderProps) {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    resolveRollbarClientToken().then(setToken);
  }, []);

  if (!token) {
    return <>{children}</>;
  }

  return (
    <RollbarProvider
      config={{
        accessToken: token,
        captureUncaught: true,
        captureUnhandledRejections: true,
        environment: process.env.NODE_ENV,
      }}
    >
      {children}
    </RollbarProvider>
  );
}