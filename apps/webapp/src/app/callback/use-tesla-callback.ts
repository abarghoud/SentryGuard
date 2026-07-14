import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams, useRouter } from 'next/navigation';
import { setToken, hasToken } from '../../core/api/token-manager';
import { getConsentStatusUseCase } from '../../features/consent/di';

interface CallbackParams {
  token: string | null;
  error: string | null;
}

function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
}

function getCookieDomain(): string | undefined {
  if (typeof window === 'undefined') return undefined;
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1' || /^[0-9.]+$/.test(hostname)) {
    return undefined;
  }
  const parts = hostname.split('.');
  if (parts.length > 2) {
    return `.${parts.slice(-2).join('.')}`;
  }
  return `.${hostname}`;
}

function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  const domain = getCookieDomain();
  let cookieString = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (domain) {
    cookieString += `; domain=${domain}`;
  }
  document.cookie = cookieString;
}

function parseCallbackParams(searchParams: URLSearchParams): CallbackParams {
  const error = searchParams.get('error');
  if (error) {
    return { token: null, error };
  }

  const cookieToken = getCookie('sentryguard_temp_token');
  if (cookieToken) {
    deleteCookie('sentryguard_temp_token');
    return { token: cookieToken, error: null };
  }

  const hash = typeof window !== 'undefined' ? window.location.hash : '';
  const search = typeof window !== 'undefined' ? window.location.search : '';
  const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
  const searchParamsDirect = new URLSearchParams(search);
  const tokenFromHash = hashParams.get('token');
  const tokenFromQuery = searchParamsDirect.get('token') || searchParams.get('token');
  const token = tokenFromHash || tokenFromQuery;

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

  const handleError = (error: string) => {
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
  };

  const checkConsentAndRedirect = async () => {
    setStatus('success');
    setMessage(t('Authentication successful! Checking consent status...'));

    const hasConsent = await fetchConsentStatus();
    const destination = hasConsent ? '/dashboard' : '/consent';
    setMessage(
      hasConsent
        ? t('Authentication successful! Redirecting to dashboard...')
        : t('Authentication successful! Redirecting to consent form...')
    );
    setTimeout(() => router.replace(destination), 1500);
  };

  useEffect(() => {
    const handleCallback = async () => {
      const { token, error } = parseCallbackParams(searchParams);

      if (error) {
        handleError(error);
        return;
      }

      if (token) {
        storeToken(token);
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
  }, [searchParams, router, t]);

  return { status, message };
}
