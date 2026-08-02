import { render } from '@testing-library/react';
import { VehiclesContainer } from './VehiclesContainer';
import { useVehiclesQuery } from '../../di';
import { VehiclesViewProps } from '../views/VehiclesView';

jest.mock('../../di', () => ({
  useVehiclesQuery: jest.fn(),
}));

jest.mock('../views/VehiclesView', () => ({
  VehiclesView: (props: VehiclesViewProps) => {
    capturedProps = props;
    return null;
  },
}));

let capturedProps: VehiclesViewProps;

describe('The VehiclesContainer component', () => {
  const fakeVin = 'VIN123';

  const renderContainer = (mutateAsync: jest.Mock) => {
    (useVehiclesQuery as jest.Mock).mockReturnValue({
      query: { data: [], isLoading: false, isFetching: false, error: null, refetch: jest.fn() },
      configureTelemetryMutation: { mutateAsync: jest.fn() },
      deleteTelemetryMutation: { mutateAsync },
      toggleBreakInMutation: { mutateAsync },
      updateOffensiveResponseMutation: { mutateAsync },
    });

    render(<VehiclesContainer />);
  };

  describe('When toggling break-in monitoring fails', () => {
    const expectedMessage = 'Failed to push telemetry configuration to Tesla';
    let outcome: { success: boolean; message?: string };

    beforeEach(async () => {
      renderContainer(jest.fn().mockRejectedValue(new Error(expectedMessage)));

      outcome = await capturedProps.onToggleBreakInMonitoring(fakeVin, true);
    });

    it('should resolve with the failure message instead of rejecting', () => {
      expect(outcome).toEqual({ success: false, message: expectedMessage });
    });
  });

  describe('When deleting telemetry fails', () => {
    const expectedMessage = 'Error deleting telemetry configuration';
    let outcome: { success: boolean; message?: string };

    beforeEach(async () => {
      renderContainer(jest.fn().mockRejectedValue(new Error(expectedMessage)));

      outcome = await capturedProps.onDeleteTelemetry(fakeVin);
    });

    it('should resolve with the failure message instead of rejecting', () => {
      expect(outcome).toEqual({ success: false, message: expectedMessage });
    });
  });

  describe('When toggling break-in monitoring succeeds', () => {
    let outcome: { success: boolean; message?: string };

    beforeEach(async () => {
      renderContainer(jest.fn().mockResolvedValue(true));

      outcome = await capturedProps.onToggleBreakInMonitoring(fakeVin, true);
    });

    it('should resolve with a successful outcome', () => {
      expect(outcome).toEqual({ success: true });
    });
  });
});
