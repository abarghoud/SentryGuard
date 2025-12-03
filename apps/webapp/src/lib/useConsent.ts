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

  const checkConsent = async () => {
    setIsLoading(true);

    try {
      const status = await getConsentStatus();

      setConsentStatus(status);
    } catch (err) {
      console.error('Consent check error:', err);
      setConsentStatus({ hasConsent: false, isRevoked: false });
    } finally {
      setIsLoading(false);
    }
  };

  const revokeUserConsent = async () => {
    setIsLoading(true);

    try {
      await revokeConsent();
      setConsentStatus(prev => prev ? { ...prev, hasConsent: false, isRevoked: true } : null);

      return true;
    } catch (err) {
      console.error('Consent revoke error:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkConsent();
  }, []);

  return {
    hasConsent: consentStatus?.hasConsent || false,
    isLoading,
    revokeConsent: revokeUserConsent,
  };
}
