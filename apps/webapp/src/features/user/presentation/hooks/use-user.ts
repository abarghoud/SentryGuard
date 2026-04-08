import { useState, useCallback, useEffect } from 'react';
import { UpdateLanguageResponse } from '../../domain/entities';
import {
  getUserLanguageUseCase,
  updateUserLanguageUseCase,
} from '../../di';

export function useUserLanguage() {
  const [language, setLanguage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchLanguage = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getUserLanguageUseCase.execute();
      setLanguage(data.language);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch user language'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateLanguage = useCallback(async (newLanguage: 'en' | 'fr'): Promise<UpdateLanguageResponse> => {
    try {
      const result = await updateUserLanguageUseCase.execute(newLanguage);
      if (result.success) {
        setLanguage(result.language);
      }
      return result;
    } catch (err) {
      console.error('Failed to update language:', err);
      throw err;
    }
  }, []);

  useEffect(() => {
    fetchLanguage();
  }, [fetchLanguage]);

  return {
    language,
    isLoading,
    error,
    refresh: fetchLanguage,
    updateLanguage,
  };
}
