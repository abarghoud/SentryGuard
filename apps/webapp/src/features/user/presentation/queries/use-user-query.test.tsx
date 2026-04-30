import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mock, MockProxy } from 'jest-mock-extended';
import { createUseUserQuery } from './use-user-query';
import {
  GetUserLanguageRequirements,
  UpdateUserLanguageRequirements,
} from '../../domain/use-cases/user.use-cases.requirements';
import { UserLanguage } from '../../domain/entities';
import React from 'react';

let mockGetUserLanguageUseCase!: MockProxy<GetUserLanguageRequirements>;
let mockUpdateUserLanguageUseCase!: MockProxy<UpdateUserLanguageRequirements>;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('The useUserQuery() hook', () => {
  let useUserQuery: ReturnType<typeof createUseUserQuery>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetUserLanguageUseCase = mock<GetUserLanguageRequirements>();
    mockUpdateUserLanguageUseCase = mock<UpdateUserLanguageRequirements>();
    
    useUserQuery = createUseUserQuery({
      getUserLanguageUseCase: mockGetUserLanguageUseCase,
      updateUserLanguageUseCase: mockUpdateUserLanguageUseCase,
    });
  });

  describe('When querying user language', () => {
    it('should return the language from the use case', async () => {
      const expectedLanguage = { language: 'fr' } as unknown as UserLanguage;
      mockGetUserLanguageUseCase.execute.mockResolvedValue(expectedLanguage);

      const { result } = renderHook(() => useUserQuery(), { wrapper });

      await waitFor(() => expect(result.current.languageQuery.isSuccess).toBe(true));

      expect(result.current.languageQuery.data).toEqual(expectedLanguage);
      expect(mockGetUserLanguageUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('When updating user language', () => {
    describe('When the update is successful', () => {
      it('should return the success result', async () => {
        mockUpdateUserLanguageUseCase.execute.mockResolvedValue({ success: true, message: '' });

        const { result } = renderHook(() => useUserQuery(), { wrapper });
        const response = await result.current.updateLanguageMutation.mutateAsync('en');

        expect(response).toEqual({ success: true, message: '' });
        expect(mockUpdateUserLanguageUseCase.execute).toHaveBeenCalledWith('en');
      });
    });

    describe('When the update fails', () => {
      it('should throw an error', async () => {
        const expectedError = 'Failed to update language';
        mockUpdateUserLanguageUseCase.execute.mockResolvedValue({ success: false, message: expectedError });

        const { result } = renderHook(() => useUserQuery(), { wrapper });

        await expect(result.current.updateLanguageMutation.mutateAsync('en')).rejects.toThrow(expectedError);
      });
    });
  });
});
