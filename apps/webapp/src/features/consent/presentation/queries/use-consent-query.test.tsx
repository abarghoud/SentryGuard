import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mock, MockProxy } from 'jest-mock-extended';
import { createUseConsentQuery } from './use-consent-query';
import {
  GetConsentStatusRequirements,
  GetConsentTextRequirements,
  AcceptConsentRequirements,
  RevokeConsentRequirements,
} from '../../domain/use-cases/consent.use-cases.requirements';
import { ConsentStatus, ConsentAcceptRequest, ConsentAcceptResponse } from '../../domain/entities';
import React from 'react';

let mockGetConsentStatusUseCase!: MockProxy<GetConsentStatusRequirements>;
let mockGetConsentTextUseCase!: MockProxy<GetConsentTextRequirements>;
let mockAcceptConsentUseCase!: MockProxy<AcceptConsentRequirements>;
let mockRevokeConsentUseCase!: MockProxy<RevokeConsentRequirements>;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('The useConsentQuery() hook', () => {
  let useConsentQuery: ReturnType<typeof createUseConsentQuery>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetConsentStatusUseCase = mock<GetConsentStatusRequirements>();
    mockGetConsentTextUseCase = mock<GetConsentTextRequirements>();
    mockAcceptConsentUseCase = mock<AcceptConsentRequirements>();
    mockRevokeConsentUseCase = mock<RevokeConsentRequirements>();
    
    useConsentQuery = createUseConsentQuery({
      getConsentStatusUseCase: mockGetConsentStatusUseCase,
      getConsentTextUseCase: mockGetConsentTextUseCase,
      acceptConsentUseCase: mockAcceptConsentUseCase,
      revokeConsentUseCase: mockRevokeConsentUseCase,
    });
  });

  describe('When querying consent status', () => {
    it('should return the status from the use case', async () => {
      const expectedStatus = { status: 'accepted' } as unknown as ConsentStatus;
      mockGetConsentStatusUseCase.execute.mockResolvedValue(expectedStatus);

      const { result } = renderHook(() => useConsentQuery(), { wrapper });

      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

      expect(result.current.query.data).toEqual(expectedStatus);
      expect(mockGetConsentStatusUseCase.execute).toHaveBeenCalled();
    });
  });

  describe('When accepting consent', () => {
    const payload = { gdpr_accepted: true } as unknown as ConsentAcceptRequest;

    describe('When the acceptance is successful', () => {
      it('should return the success result', async () => {
        const expectedResponse = {
          success: true,
          consent: { id: '1', acceptedAt: '2023-01-01', version: 'v1' },
        };
        mockAcceptConsentUseCase.execute.mockResolvedValue(expectedResponse);

        const { result } = renderHook(() => useConsentQuery(), { wrapper });
        const response = await result.current.acceptConsentMutation.mutateAsync(payload);

        expect(response).toEqual(expectedResponse);
        expect(mockAcceptConsentUseCase.execute).toHaveBeenCalledWith(payload);
      });
    });

    describe('When the acceptance fails', () => {
      it('should throw an error', async () => {
        const expectedError = 'Failed to accept consent';
        mockAcceptConsentUseCase.execute.mockResolvedValue({ success: false } as unknown as ConsentAcceptResponse);

        const { result } = renderHook(() => useConsentQuery(), { wrapper });

        await expect(result.current.acceptConsentMutation.mutateAsync(payload)).rejects.toThrow(expectedError);
      });
    });
  });

  describe('When revoking consent', () => {
    describe('When the revocation is successful', () => {
      it('should return the success result', async () => {
        mockRevokeConsentUseCase.execute.mockResolvedValue({ success: true, message: '' });

        const { result } = renderHook(() => useConsentQuery(), { wrapper });
        const response = await result.current.revokeConsentMutation.mutateAsync();

        expect(response).toEqual({ success: true, message: '' });
        expect(mockRevokeConsentUseCase.execute).toHaveBeenCalled();
      });
    });

    describe('When the revocation fails', () => {
      it('should throw an error', async () => {
        const expectedError = 'Failed to revoke consent';
        mockRevokeConsentUseCase.execute.mockResolvedValue({ success: false, message: expectedError });

        const { result } = renderHook(() => useConsentQuery(), { wrapper });

        await expect(result.current.revokeConsentMutation.mutateAsync()).rejects.toThrow(expectedError);
      });
    });
  });
});
