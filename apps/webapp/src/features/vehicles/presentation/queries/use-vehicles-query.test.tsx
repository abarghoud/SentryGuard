import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mock, MockProxy } from 'jest-mock-extended';
import { createUseVehiclesQuery } from './use-vehicles-query';
import { hasToken } from '../../../../core/api/token-manager';
import {
  GetVehiclesRequirements,
  ConfigureTelemetryRequirements,
  DeleteTelemetryConfigRequirements,
  ToggleBreakInMonitoringRequirements,
} from '../../domain/use-cases/vehicles.use-cases.requirements';
import { Vehicle } from '../../domain/entities';
import React from 'react';

jest.mock('../../../../core/api/token-manager', () => ({
  hasToken: jest.fn(),
}));

let mockGetVehiclesUseCase!: MockProxy<GetVehiclesRequirements>;
let mockConfigureTelemetryUseCase!: MockProxy<ConfigureTelemetryRequirements>;
let mockDeleteTelemetryConfigUseCase!: MockProxy<DeleteTelemetryConfigRequirements>;
let mockToggleBreakInMonitoringUseCase!: MockProxy<ToggleBreakInMonitoringRequirements>;

const wrapper = ({ children }: { children: React.ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('The useVehiclesQuery() hook', () => {
  let useVehiclesQuery: ReturnType<typeof createUseVehiclesQuery>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetVehiclesUseCase = mock<GetVehiclesRequirements>();
    mockConfigureTelemetryUseCase = mock<ConfigureTelemetryRequirements>();
    mockDeleteTelemetryConfigUseCase = mock<DeleteTelemetryConfigRequirements>();
    mockToggleBreakInMonitoringUseCase = mock<ToggleBreakInMonitoringRequirements>();
    
    useVehiclesQuery = createUseVehiclesQuery({
      getVehiclesUseCase: mockGetVehiclesUseCase,
      configureTelemetryUseCase: mockConfigureTelemetryUseCase,
      deleteTelemetryConfigUseCase: mockDeleteTelemetryConfigUseCase,
      toggleBreakInMonitoringUseCase: mockToggleBreakInMonitoringUseCase,
    });
  });

  describe('When querying vehicles', () => {
    describe('When the user has no token', () => {
      beforeEach(() => {
        (hasToken as jest.Mock).mockReturnValue(false);
      });

      it('should return an empty array and not call the use case', async () => {
        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.query.data).toEqual([]);
        expect(mockGetVehiclesUseCase.execute).not.toHaveBeenCalled();
      });
    });

    describe('When the user has a token', () => {
      beforeEach(() => {
        (hasToken as jest.Mock).mockReturnValue(true);
      });

      it('should return the vehicles from the use case', async () => {
        const expectedVehicles = [{ id: '1', vin: 'VIN123' }] as unknown as Vehicle[];
        mockGetVehiclesUseCase.execute.mockResolvedValue(expectedVehicles);

        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });

        await waitFor(() => expect(result.current.query.isSuccess).toBe(true));

        expect(result.current.query.data).toEqual(expectedVehicles);
        expect(mockGetVehiclesUseCase.execute).toHaveBeenCalled();
      });
    });
  });

  describe('When configuring telemetry', () => {
    describe('When the configuration is completely successful', () => {
      it('should return success true', async () => {
        mockConfigureTelemetryUseCase.execute.mockResolvedValue({
          result: { success: true },
          message: ''
        });

        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });
        const response = await result.current.configureTelemetryMutation.mutateAsync('VIN123');

        expect(response).toEqual({ success: true });
        expect(mockConfigureTelemetryUseCase.execute).toHaveBeenCalledWith('VIN123');
      });
    });

    describe('When the configuration is skipped for the vehicle', () => {
      it('should return success false with skipped details', async () => {
        const skippedVehicle = { vin: 'VIN123', reason: 'not_supported' };
        mockConfigureTelemetryUseCase.execute.mockResolvedValue({
          result: { success: true, skippedVehicle },
          message: ''
        });

        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });
        const response = await result.current.configureTelemetryMutation.mutateAsync('VIN123');

        expect(response).toEqual({
          success: false,
          message: 'Telemetry configuration skipped for this vehicle',
          skippedVehicle,
        });
      });
    });

    describe('When the configuration fails', () => {
      it('should return success false with error message', async () => {
        const expectedMessage = 'Custom error message';
        mockConfigureTelemetryUseCase.execute.mockResolvedValue({
          message: expectedMessage,
          result: { success: false },
        });

        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });
        const response = await result.current.configureTelemetryMutation.mutateAsync('VIN123');

        expect(response).toEqual({
          success: false,
          message: expectedMessage,
          skippedVehicle: null,
        });
      });
    });
  });

  describe('When deleting telemetry config', () => {
    describe('When the deletion is successful', () => {
      it('should return true', async () => {
        mockDeleteTelemetryConfigUseCase.execute.mockResolvedValue({ success: true, message: '' });

        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });
        const response = await result.current.deleteTelemetryMutation.mutateAsync('VIN123');

        expect(response).toBe(true);
        expect(mockDeleteTelemetryConfigUseCase.execute).toHaveBeenCalledWith('VIN123');
      });
    });

    describe('When the deletion fails', () => {
      it('should throw an error', async () => {
        const expectedError = 'Failed to delete config';
        mockDeleteTelemetryConfigUseCase.execute.mockResolvedValue({ success: false, message: expectedError });

        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });

        await expect(result.current.deleteTelemetryMutation.mutateAsync('VIN123')).rejects.toThrow(expectedError);
      });
    });
  });

  describe('When toggling break-in monitoring', () => {
    describe('When the toggle is successful', () => {
      it('should return true', async () => {
        mockToggleBreakInMonitoringUseCase.execute.mockResolvedValue({ success: true, message: '' });

        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });
        const response = await result.current.toggleBreakInMutation.mutateAsync({ vin: 'VIN123', enable: true });

        expect(response).toBe(true);
        expect(mockToggleBreakInMonitoringUseCase.execute).toHaveBeenCalledWith('VIN123', true);
      });
    });

    describe('When the toggle fails', () => {
      it('should throw an error', async () => {
        const expectedError = 'Failed to toggle break-in monitoring';
        mockToggleBreakInMonitoringUseCase.execute.mockResolvedValue({ success: false, message: expectedError });

        const { result } = renderHook(() => useVehiclesQuery(), { wrapper });

        await expect(
          result.current.toggleBreakInMutation.mutateAsync({ vin: 'VIN123', enable: true })
        ).rejects.toThrow(expectedError);
      });
    });
  });
});
