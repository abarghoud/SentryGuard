import { renderHook, act } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import { useTelemetryActivation } from './use-telemetry-activation';
import { useOnboardingQuery } from '../../di';
import { useVehiclesQuery } from '../../../vehicles/di';

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('../../di', () => ({
  useOnboardingQuery: jest.fn(),
}));

jest.mock('../../../vehicles/di', () => ({
  useVehiclesQuery: jest.fn(),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('The useTelemetryActivation() hook', () => {
  let mockRouter: { push: jest.Mock };
  let mockCompleteOnboardingMutation: { mutateAsync: jest.Mock };
  let mockConfigureTelemetryMutation: { mutateAsync: jest.Mock };
  let mockDeleteTelemetryMutation: { mutateAsync: jest.Mock };
  let mockToggleBreakInMutation: { mutateAsync: jest.Mock };
  let mockUpdateOffensiveResponseMutation: { mutateAsync: jest.Mock };

  beforeEach(() => {
    jest.clearAllMocks();
    mockRouter = { push: jest.fn() };
    (useRouter as jest.Mock).mockReturnValue(mockRouter);

    mockCompleteOnboardingMutation = {
      mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    };
    (useOnboardingQuery as jest.Mock).mockReturnValue({
      completeOnboardingMutation: mockCompleteOnboardingMutation,
    });

    mockConfigureTelemetryMutation = {
      mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    };
    mockDeleteTelemetryMutation = {
      mutateAsync: jest.fn().mockResolvedValue(true),
    };
    mockToggleBreakInMutation = {
      mutateAsync: jest.fn().mockResolvedValue(true),
    };
    mockUpdateOffensiveResponseMutation = {
      mutateAsync: jest.fn().mockResolvedValue({ success: true }),
    };

    (useVehiclesQuery as jest.Mock).mockReturnValue({
      query: { data: [], isLoading: false },
      configureTelemetryMutation: mockConfigureTelemetryMutation,
      deleteTelemetryMutation: mockDeleteTelemetryMutation,
      toggleBreakInMutation: mockToggleBreakInMutation,
      updateOffensiveResponseMutation: mockUpdateOffensiveResponseMutation,
    });
  });

  describe('When freshly mounted with no vehicles', () => {
    let result: ReturnType<typeof renderHook<ReturnType<typeof useTelemetryActivation>, unknown>>['result'];

    beforeEach(() => {
      ({ result } = renderHook(() => useTelemetryActivation()));
    });

    it('should return empty vehicles array', () => {
      expect(result.current.vehicles).toStrictEqual([]);
    });

    it('should have telemetry disabled', () => {
      expect(result.current.hasTelemetryEnabled).toBe(false);
    });
  });

  describe('When freshly mounted with telemetry enabled on Sentry Mode', () => {
    let result: ReturnType<typeof renderHook<ReturnType<typeof useTelemetryActivation>, unknown>>['result'];

    beforeEach(() => {
      (useVehiclesQuery as jest.Mock).mockReturnValue({
        query: {
          data: [{ vin: 'VIN123', sentry_mode_monitoring_enabled: true }],
          isLoading: false,
        },
        configureTelemetryMutation: mockConfigureTelemetryMutation,
        deleteTelemetryMutation: mockDeleteTelemetryMutation,
        toggleBreakInMutation: mockToggleBreakInMutation,
        updateOffensiveResponseMutation: mockUpdateOffensiveResponseMutation,
      });

      ({ result } = renderHook(() => useTelemetryActivation()));
    });

    it('should have telemetry enabled', () => {
      expect(result.current.hasTelemetryEnabled).toBe(true);
    });
  });

  describe('When enabling telemetry for a vehicle', () => {
    let result: ReturnType<typeof renderHook<ReturnType<typeof useTelemetryActivation>, unknown>>['result'];

    beforeEach(async () => {
      ({ result } = renderHook(() => useTelemetryActivation()));

      await act(async () => {
        await result.current.handleToggleSentry('VIN123', false);
      });
    });

    it('should call configureTelemetryMutation', () => {
      expect(mockConfigureTelemetryMutation.mutateAsync).toHaveBeenCalledWith('VIN123');
    });
  });

  describe('When disabling telemetry for a vehicle', () => {
    let result: ReturnType<typeof renderHook<ReturnType<typeof useTelemetryActivation>, unknown>>['result'];

    beforeEach(async () => {
      window.confirm = jest.fn().mockReturnValue(true);
      ({ result } = renderHook(() => useTelemetryActivation()));

      await act(async () => {
        await result.current.handleToggleSentry('VIN123', true);
      });
    });

    it('should call deleteTelemetryMutation', () => {
      expect(mockDeleteTelemetryMutation.mutateAsync).toHaveBeenCalledWith('VIN123');
    });
  });

  describe('When toggling break-in monitoring', () => {
    let result: ReturnType<typeof renderHook<ReturnType<typeof useTelemetryActivation>, unknown>>['result'];

    beforeEach(async () => {
      ({ result } = renderHook(() => useTelemetryActivation()));

      await act(async () => {
        await result.current.handleToggleBreakIn('VIN123', false);
      });
    });

    it('should call toggleBreakInMutation', () => {
      expect(mockToggleBreakInMutation.mutateAsync).toHaveBeenCalledWith({ vin: 'VIN123', enable: true });
    });
  });

  describe('When toggling offensive response', () => {
    let result: ReturnType<typeof renderHook<ReturnType<typeof useTelemetryActivation>, unknown>>['result'];

    beforeEach(async () => {
      ({ result } = renderHook(() => useTelemetryActivation()));

      await act(async () => {
        await result.current.handleToggleOffensive('VIN123', false);
      });
    });

    it('should call updateOffensiveResponseMutation', () => {
      expect(mockUpdateOffensiveResponseMutation.mutateAsync).toHaveBeenCalledWith({
        vin: 'VIN123',
        breakInResponse: 'HONK',
      });
    });
  });

  describe('When completing onboarding', () => {
    describe('When onCompleted callback is provided', () => {
      let mockOnCompleted: jest.Mock;
      let result: ReturnType<typeof renderHook<ReturnType<typeof useTelemetryActivation>, unknown>>['result'];

      beforeEach(async () => {
        mockOnCompleted = jest.fn().mockResolvedValue(undefined);
        ({ result } = renderHook(() => useTelemetryActivation(mockOnCompleted)));

        await act(async () => {
          await result.current.handleCompleteOnboarding();
        });
      });

      it('should call the callback', () => {
        expect(mockOnCompleted).toHaveBeenCalledTimes(1);
      });
    });

    describe('When onCompleted callback is not provided', () => {
      let result: ReturnType<typeof renderHook<ReturnType<typeof useTelemetryActivation>, unknown>>['result'];

      beforeEach(async () => {
        ({ result } = renderHook(() => useTelemetryActivation()));

        await act(async () => {
          await result.current.handleCompleteOnboarding();
        });
      });

      it('should redirect to dashboard', () => {
        expect(mockRouter.push).toHaveBeenCalledWith('/dashboard');
      });
    });
  });
});
