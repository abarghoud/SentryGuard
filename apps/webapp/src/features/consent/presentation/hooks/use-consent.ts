import { useState, useCallback, useEffect } from 'react';
import { ConsentStatus, ConsentAcceptRequest, ConsentTextResponse, ConsentAcceptResponse, GenericConsentResponse } from '../../domain/entities';
import {
  getConsentStatusUseCase,
  getConsentTextUseCase,
  acceptConsentUseCase,
  revokeConsentUseCase,
} from '../../di';

export function useConsent(autoFetchStatus = true) {
  const [status, setStatus] = useState<ConsentStatus | null>(null);
  const [textData, setTextData] = useState<ConsentTextResponse | null>(null);
  const [isLoading, setIsLoading] = useState(autoFetchStatus);
  const [error, setError] = useState<Error | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getConsentStatusUseCase.execute();
      setStatus(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch consent status'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchText = useCallback(async (version?: string, locale?: string) => {
    try {
      const data = await getConsentTextUseCase.execute(version, locale);
      setTextData(data);
      return data;
    } catch (err) {
      console.error('Failed to fetch consent text:', err);
      throw err;
    }
  }, []);

  const acceptConsent = useCallback(async (consentData: ConsentAcceptRequest): Promise<ConsentAcceptResponse> => {
    try {
      const result = await acceptConsentUseCase.execute(consentData);
      if (result.success) {
        await fetchStatus();
      }
      return result;
    } catch (err) {
      console.error('Failed to accept consent:', err);
      throw err;
    }
  }, [fetchStatus]);

  const revokeConsent = useCallback(async (): Promise<GenericConsentResponse> => {
    try {
      const result = await revokeConsentUseCase.execute();
      if (result.success) {
        await fetchStatus();
      }
      return result;
    } catch (err) {
      console.error('Failed to revoke consent:', err);
      throw err;
    }
  }, [fetchStatus]);

  useEffect(() => {
    if (autoFetchStatus) {
      fetchStatus();
    }
  }, [autoFetchStatus, fetchStatus]);

  return {
    status,
    textData,
    isLoading,
    error,
    refreshStatus: fetchStatus,
    fetchText,
    acceptConsent,
    revokeConsent,
  };
}
