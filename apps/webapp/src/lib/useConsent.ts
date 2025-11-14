'use client';

import { useState, useEffect } from 'react';
import {
  getConsentStatus,
  revokeConsent,
  type ConsentStatus,
} from './api';

export function useConsent() {
  const [consentStatus, setConsentStatus] = useState<ConsentStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const checkConsent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const status = await getConsentStatus();
      setConsentStatus(status);
    } catch (err) {
      console.error('Consent check error:', err);
      setError(
        err instanceof Error ? err.message : 'Consent check failed'
      );
      // If consent check fails, assume no consent to be safe
      setConsentStatus({ hasConsent: false, isRevoked: false });
    } finally {
      setIsLoading(false);
    }
  };

  const revokeUserConsent = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await revokeConsent();
      // Update local state
      setConsentStatus(prev => prev ? { ...prev, hasConsent: false, isRevoked: true } : null);
      return true;
    } catch (err) {
      console.error('Consent revoke error:', err);
      setError(
        err instanceof Error ? err.message : 'Failed to revoke consent'
      );
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshConsent = () => {
    checkConsent();
  };

  useEffect(() => {
    checkConsent();
  }, []);

  return {
    consentStatus,
    isLoading,
    error,
    hasConsent: consentStatus?.hasConsent || false,
    isRevoked: consentStatus?.isRevoked || false,
    checkConsent,
    refreshConsent,
    revokeConsent: revokeUserConsent,
  };
}
