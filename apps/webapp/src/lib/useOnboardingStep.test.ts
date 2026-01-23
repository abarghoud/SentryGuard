import { renderHook, act, waitFor } from '@testing-library/react';
import { useOnboardingStep } from './useOnboardingStep';
import { OnboardingStep } from './useOnboarding';
import * as useTelegram from './useTelegram';
import * as useVehicles from './useVehicles';

jest.mock('./useTelegram');
jest.mock('./useVehicles');

const mockUseTelegram = useTelegram as jest.Mocked<typeof useTelegram>;
const mockUseVehicles = useVehicles as jest.Mocked<typeof useVehicles>;

describe('The useOnboardingStep() hook', () => {
  const mockFetchTelegramStatus = jest.fn();
  const mockFetchVehicles = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseTelegram.useTelegram.mockReturnValue({
      status: undefined,
      linkInfo: null,
      isLoading: false,
      error: null,
      generateLink: jest.fn(),
      unlink: jest.fn(),
      sendTest: jest.fn(),
      fetchStatus: mockFetchTelegramStatus,
    } as any);

    mockUseVehicles.useVehicles.mockReturnValue({
      vehicles: [],
      isLoading: false,
      error: null,
      fetchVehicles: mockFetchVehicles,
      configureTelemetryForVehicle: jest.fn(),
    } as any);
  });

  describe('When telegram is not linked', () => {
    beforeEach(() => {
      mockUseTelegram.useTelegram.mockReturnValue({
        status: { linked: false },
        linkInfo: null,
        isLoading: false,
        error: null,
        generateLink: jest.fn(),
        unlink: jest.fn(),
        sendTest: jest.fn(),
        fetchStatus: mockFetchTelegramStatus,
      } as any);
    });

    it('should return telegram link step', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentStep).toBe(OnboardingStep.TELEGRAM_LINK);
    });

    it('should indicate telegram is not linked', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.isTelegramLinked).toBe(false);
    });
  });

  describe('When telegram is linked but virtual key is not paired', () => {
    beforeEach(() => {
      mockUseTelegram.useTelegram.mockReturnValue({
        status: { linked: true },
        linkInfo: null,
        isLoading: false,
        error: null,
        generateLink: jest.fn(),
        unlink: jest.fn(),
        sendTest: jest.fn(),
        fetchStatus: mockFetchTelegramStatus,
      } as any);

      mockUseVehicles.useVehicles.mockReturnValue({
        vehicles: [
          {
            vin: 'VIN123',
            key_paired: false,
          },
        ],
        isLoading: false,
        error: null,
        fetchVehicles: mockFetchVehicles,
        configureTelemetryForVehicle: jest.fn(),
      } as any);
    });

    it('should return virtual key setup step', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentStep).toBe(OnboardingStep.VIRTUAL_KEY_SETUP);
    });

    it('should indicate telegram is linked', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.isTelegramLinked).toBe(true);
    });

    it('should indicate virtual key is not paired', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.isVirtualKeyPaired).toBe(false);
    });
  });

  describe('When telegram is linked and virtual key is paired', () => {
    beforeEach(() => {
      mockUseTelegram.useTelegram.mockReturnValue({
        status: { linked: true },
        linkInfo: null,
        isLoading: false,
        error: null,
        generateLink: jest.fn(),
        unlink: jest.fn(),
        sendTest: jest.fn(),
        fetchStatus: mockFetchTelegramStatus,
      } as any);

      mockUseVehicles.useVehicles.mockReturnValue({
        vehicles: [
          {
            vin: 'VIN123',
            key_paired: true,
          },
        ],
        isLoading: false,
        error: null,
        fetchVehicles: mockFetchVehicles,
        configureTelemetryForVehicle: jest.fn(),
      } as any);
    });

    it('should return telemetry activation step', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentStep).toBe(OnboardingStep.TELEMETRY_ACTIVATION);
    });

    it('should indicate telegram is linked', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.isTelegramLinked).toBe(true);
    });

    it('should indicate virtual key is paired', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.isVirtualKeyPaired).toBe(true);
    });
  });

  describe('When multiple vehicles with mixed key_paired status', () => {
    beforeEach(() => {
      mockUseTelegram.useTelegram.mockReturnValue({
        status: { linked: true },
        linkInfo: null,
        isLoading: false,
        error: null,
        generateLink: jest.fn(),
        unlink: jest.fn(),
        sendTest: jest.fn(),
        fetchStatus: mockFetchTelegramStatus,
      } as any);

      mockUseVehicles.useVehicles.mockReturnValue({
        vehicles: [
          {
            vin: 'VIN123',
            key_paired: false,
          },
          {
            vin: 'VIN456',
            key_paired: true,
          },
        ],
        isLoading: false,
        error: null,
        fetchVehicles: mockFetchVehicles,
        configureTelemetryForVehicle: jest.fn(),
      } as any);
    });

    it('should indicate virtual key is paired when at least one vehicle has key paired', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.isVirtualKeyPaired).toBe(true);
    });

    it('should return telemetry activation step', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.currentStep).toBe(OnboardingStep.TELEMETRY_ACTIVATION);
    });
  });

  describe('The refreshAll() function', () => {
    beforeEach(() => {
      mockUseTelegram.useTelegram.mockReturnValue({
        status: { linked: true },
        linkInfo: null,
        isLoading: false,
        error: null,
        generateLink: jest.fn(),
        unlink: jest.fn(),
        sendTest: jest.fn(),
        fetchStatus: mockFetchTelegramStatus,
      } as any);

      mockUseVehicles.useVehicles.mockReturnValue({
        vehicles: [],
        isLoading: false,
        error: null,
        fetchVehicles: mockFetchVehicles,
        configureTelemetryForVehicle: jest.fn(),
      } as any);
    });

    it('should call both fetch functions', async () => {
      const { result } = renderHook(() => useOnboardingStep());

      await act(async () => {
        await result.current.refreshAll();
      });

      expect(mockFetchTelegramStatus).toHaveBeenCalled();
      expect(mockFetchVehicles).toHaveBeenCalled();
    });
  });

  describe('When telegram or vehicles are loading', () => {
    beforeEach(() => {
      mockUseTelegram.useTelegram.mockReturnValue({
        status: undefined,
        linkInfo: null,
        isLoading: true,
        error: null,
        generateLink: jest.fn(),
        unlink: jest.fn(),
        sendTest: jest.fn(),
        fetchStatus: mockFetchTelegramStatus,
      } as any);

      mockUseVehicles.useVehicles.mockReturnValue({
        vehicles: [],
        isLoading: false,
        error: null,
        fetchVehicles: mockFetchVehicles,
        configureTelemetryForVehicle: jest.fn(),
      } as any);
    });

    it('should indicate loading state', () => {
      const { result } = renderHook(() => useOnboardingStep());

      expect(result.current.isLoading).toBe(true);
    });
  });
});