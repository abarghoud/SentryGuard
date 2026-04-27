import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mock, MockProxy } from 'jest-mock-extended';
import { createUseTelegramQuery } from './use-telegram-query';
import { hasToken } from '../../../../core/api/token-manager';
import {
  GenerateTelegramLinkRequirements,
  GetTelegramStatusRequirements,
  UnlinkTelegramRequirements,
  SendTestMessageRequirements,
} from '../../domain/use-cases/telegram.use-cases.requirements';
import { TelegramStatus, TelegramLinkInfo } from '../../domain/entities';
import React from 'react';

jest.mock('../../../../core/api/token-manager', () => ({
  hasToken: jest.fn(),
}));

let mockGetTelegramStatusUseCase!: MockProxy<GetTelegramStatusRequirements>;
let mockGenerateTelegramLinkUseCase!: MockProxy<GenerateTelegramLinkRequirements>;
let mockUnlinkTelegramUseCase!: MockProxy<UnlinkTelegramRequirements>;
let mockSendTestMessageUseCase!: MockProxy<SendTestMessageRequirements>;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('The useTelegramQuery() hook', () => {
  let useTelegramQuery: ReturnType<typeof createUseTelegramQuery>;

  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    mockGetTelegramStatusUseCase = mock<GetTelegramStatusRequirements>();
    mockGenerateTelegramLinkUseCase = mock<GenerateTelegramLinkRequirements>();
    mockUnlinkTelegramUseCase = mock<UnlinkTelegramRequirements>();
    mockSendTestMessageUseCase = mock<SendTestMessageRequirements>();
    
    useTelegramQuery = createUseTelegramQuery({
      getTelegramStatusUseCase: mockGetTelegramStatusUseCase,
      generateTelegramLinkUseCase: mockGenerateTelegramLinkUseCase,
      unlinkTelegramUseCase: mockUnlinkTelegramUseCase,
      sendTestMessageUseCase: mockSendTestMessageUseCase,
    });
  });

  describe('When querying telegram status', () => {
    describe('When the user has no token', () => {
      beforeEach(() => {
        (hasToken as jest.Mock).mockReturnValue(false);
      });

      it('should return null and not call the use case', async () => {
        const { result } = renderHook(() => useTelegramQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.query.data).toBeNull();
        expect(mockGetTelegramStatusUseCase.execute).not.toHaveBeenCalled();
      });

      it('should clear stored link info', async () => {
        localStorage.setItem('telegram_link_info', JSON.stringify({ token: 'test' }));
        const { result } = renderHook(() => useTelegramQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(localStorage.getItem('telegram_link_info')).toBeNull();
      });
    });

    describe('When the user has a token and status is pending', () => {
      beforeEach(() => {
        (hasToken as jest.Mock).mockReturnValue(true);
        mockGetTelegramStatusUseCase.execute.mockResolvedValue({ status: 'pending', message: '' } as unknown as TelegramStatus);
      });

      it('should return the pending status', async () => {
        const { result } = renderHook(() => useTelegramQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.query.data).toEqual({ status: 'pending', message: '' });
      });

      it('should load link info from storage if valid', async () => {
        const validInfo = { token: '123', expires_at: new Date(Date.now() + 100000).toISOString() };
        localStorage.setItem('telegram_link_info', JSON.stringify(validInfo));

        const { result } = renderHook(() => useTelegramQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.linkInfo).toEqual(validInfo);
      });
      
      it('should clear link info from storage if expired', async () => {
        const expiredInfo = { token: '123', expires_at: new Date(Date.now() - 100000).toISOString() };
        localStorage.setItem('telegram_link_info', JSON.stringify(expiredInfo));

        const { result } = renderHook(() => useTelegramQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.linkInfo).toBeNull();
        expect(localStorage.getItem('telegram_link_info')).toBeNull();
      });
    });

    describe('When the user has a token and status is linked', () => {
      beforeEach(() => {
        (hasToken as jest.Mock).mockReturnValue(true);
        mockGetTelegramStatusUseCase.execute.mockResolvedValue({ status: 'linked', username: 'testuser', message: '' } as unknown as TelegramStatus);
      });

      it('should return the linked status', async () => {
        const { result } = renderHook(() => useTelegramQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.query.data).toEqual({ status: 'linked', username: 'testuser', message: '' });
      });

      it('should clear any stored link info', async () => {
        localStorage.setItem('telegram_link_info', JSON.stringify({ token: '123' }));
        
        const { result } = renderHook(() => useTelegramQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.linkInfo).toBeNull();
        expect(localStorage.getItem('telegram_link_info')).toBeNull();
      });
    });
  });

  describe('When generating a link', () => {
    it('should save the link info in storage and state', async () => {
      const expectedData = { token: 'test-token', bot_url: 'https://t.me/bot' } as unknown as TelegramLinkInfo;
      mockGenerateTelegramLinkUseCase.execute.mockResolvedValue(expectedData);

      const { result } = renderHook(() => useTelegramQuery(), { wrapper });
      const response = await result.current.generateLinkMutation.mutateAsync();

      expect(response).toEqual(expectedData);
      expect(result.current.linkInfo).toEqual(expectedData);
      expect(JSON.parse(localStorage.getItem('telegram_link_info') as string)).toEqual(expectedData);
    });
  });

  describe('When unlinking telegram', () => {
    it('should clear the link info and call the use case', async () => {
      localStorage.setItem('telegram_link_info', JSON.stringify({ token: 'test' }));
      mockUnlinkTelegramUseCase.execute.mockResolvedValue({ success: true, message: '' });

      const { result } = renderHook(() => useTelegramQuery(), { wrapper });
      
      // Need to wait for initial load to finish setting linkInfo
      await waitFor(() => expect(result.current.query.isSuccess).toBe(true));
      
      await result.current.unlinkMutation.mutateAsync();

      expect(mockUnlinkTelegramUseCase.execute).toHaveBeenCalled();
      expect(result.current.linkInfo).toBeNull();
      expect(localStorage.getItem('telegram_link_info')).toBeNull();
    });
  });

  describe('When sending a test message', () => {
    describe('When the message is sent successfully', () => {
      it('should return true', async () => {
        mockSendTestMessageUseCase.execute.mockResolvedValue({ success: true, message: '' });

        const { result } = renderHook(() => useTelegramQuery(), { wrapper });
        const response = await result.current.sendTestMutation.mutateAsync();

        expect(response).toBe(true);
        expect(mockSendTestMessageUseCase.execute).toHaveBeenCalled();
      });
    });

    describe('When the message fails to send', () => {
      it('should throw an error', async () => {
        const expectedError = 'Failed to send test message';
        mockSendTestMessageUseCase.execute.mockResolvedValue({ success: false, message: expectedError });

        const { result } = renderHook(() => useTelegramQuery(), { wrapper });

        await expect(result.current.sendTestMutation.mutateAsync()).rejects.toThrow(expectedError);
      });
    });
  });
});
