import { useEffect, useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter } from 'next/navigation';
import { setToken, hasToken } from '../../core/api/token-manager';
import { apiClient } from '../../core/api';
import { getConsentStatusUseCase } from '../../features/consent/di';

interface CallbackParams {
  token: string | null;
  error: string | null;
}

async function exchangeSessionToken(): Promise<string | null> {
  try {
    const { token } = await apiClient.request<{ token: string }>(
      '/auth/session/exchange',
      { method: 'POST', credentials: 'include' }
    );
    return token ?? null;
  } catch {
    return null;
  }
}

function parseCallbackParams(searchParams: URLSearchParams): CallbackParams {
  const error = searchParams.get('error');
  if (error) {
    return { token: null, error };
  }

  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const token = hashParams.get('token');

  return { token, error: null };
}

function getMissingScopes(error: string): string[] {
  return error.match(/Missing required permissions: (.+)/)?.[1]?.split(', ') || [];
}

function storeToken(token: string): void {
  setToken(token);
  if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

async function fetchConsentStatus(): Promise<boolean> {
  try {
    const consentStatus = await getConsentStatusUseCase.execute();
    return consentStatus.hasConsent;
  } catch (error) {
    console.warn('Failed to check consent status:', error);
    return false;
  }
}

export function useTeslaCallback() {
  const { t } = useTranslation('common');
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'cancelled'>(
    'loading'
  );
  const [message, setMessage] = useState(t('Processing authentication...'));

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const exchangeAttempted = useRef(false);

  const handleError = useCallback((error: string) => {
    if (error === 'login_cancelled') {
      setStatus('cancelled');
      setMessage(t('You cancelled the Tesla login. You can try again whenever you\'re ready.'));
      return;
    }

    if (error.includes('Missing required permissions')) {
      const missing = getMissingScopes(error).join(',');
      router.replace(`/scopes-fix?missing=${missing}`);
      return;
    }

    setStatus('error');
    setMessage(t('Authentication failed {{error}}', { error }));
  }, [router, t]);

  const checkConsentAndRedirect = useCallback(async () => {
    setStatus('success');
    setMessage(t('Authentication successful! Checking consent status...'));

    const hasConsent = await fetchConsentStatus();
    const destination = hasConsent ? '/dashboard' : '/consent';
    setMessage(
      hasConsent
        ? t('Authentication successful! Redirecting to dashboard...')
        : t('Authentication successful! Redirecting to consent form...')
    );
    timerRef.current = setTimeout(() => router.replace(destination), 1500);
  }, [router, t]);

  useEffect(() => {
    const handleCallback = async () => {
      if (exchangeAttempted.current) return;
      exchangeAttempted.current = true;

      const { token, error } = parseCallbackParams(searchParams);

      if (error) {
        handleError(error);
        return;
      }

      const sessionToken = token ?? (await exchangeSessionToken());

      if (sessionToken) {
        storeToken(sessionToken);
      }

      if (hasToken()) {
        await checkConsentAndRedirect();
      } else {
        setStatus('error');
        setMessage(
          'No authentication token received. Please try logging in again.'
        );
      }
    };

    handleCallback();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [searchParams, handleError, checkConsentAndRedirect]);

  return { status, message };
}
