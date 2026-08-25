import { act, render, screen, fireEvent } from '@testing-library/react';
import VehicleCard from './VehicleCard';
import { Vehicle, VehicleActionOutcome } from '../features/vehicles/domain/entities';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

describe('The VehicleCard component', () => {
  const fakeVehicle: Vehicle = {
    id: '1',
    vin: 'VIN123',
    display_name: 'My Tesla',
    sentry_mode_monitoring_enabled: false,
    break_in_monitoring_enabled: false,
    created_at: '2026-01-01',
    updated_at: '2026-01-01',
  };

  const renderCard = (
    vehicle: Vehicle,
    handlers: {
      onToggleBreakInMonitoring?: jest.Mock;
      onDeleteTelemetry?: jest.Mock;
    } = {}
  ) =>
    render(
      <VehicleCard
        vehicle={vehicle}
        onPairVirtualKey={jest.fn()}
        onToggleTelemetry={jest.fn().mockResolvedValue({ success: true })}
        onToggleBreakInMonitoring={
          handlers.onToggleBreakInMonitoring ?? jest.fn().mockResolvedValue({ success: true })
        }
        onUpdateBreakInOffensive={jest.fn().mockResolvedValue({ success: true })}
        onUpdateAutoSentry={jest.fn().mockResolvedValue({ success: true })}
        onDeleteTelemetry={handlers.onDeleteTelemetry ?? jest.fn().mockResolvedValue({ success: true })}
      />
    );

  const clickAndSettle = async (title: string): Promise<void> => {
    await act(async () => {
      fireEvent.click(screen.getByTitle(title));
    });
  };

  describe('The break-in monitoring toggle', () => {
    describe('When the toggle fails with a server message', () => {
      const expectedMessage = 'Failed to push telemetry configuration to Tesla';

      beforeEach(async () => {
        const outcome: VehicleActionOutcome = { success: false, message: expectedMessage };
        renderCard(fakeVehicle, {
          onToggleBreakInMonitoring: jest.fn().mockResolvedValue(outcome),
        });

        await clickAndSettle('Enable Break-in');
      });

      it('should display the server message', () => {
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      });
    });

    describe('When the toggle fails without a server message', () => {
      beforeEach(async () => {
        const outcome: VehicleActionOutcome = { success: false };
        renderCard(fakeVehicle, {
          onToggleBreakInMonitoring: jest.fn().mockResolvedValue(outcome),
        });

        await clickAndSettle('Enable Break-in');
      });

      it('should display the fallback message', () => {
        expect(screen.getByText('Failed to update Break-in monitoring')).toBeInTheDocument();
      });
    });

    describe('When the toggle succeeds', () => {
      let onToggleBreakInMonitoring: jest.Mock;

      beforeEach(async () => {
        onToggleBreakInMonitoring = jest.fn().mockResolvedValue({ success: true });
        renderCard(fakeVehicle, { onToggleBreakInMonitoring });

        await clickAndSettle('Enable Break-in');
      });

      it('should request the toggle', () => {
        expect(onToggleBreakInMonitoring).toHaveBeenCalledWith(fakeVehicle.vin, true);
      });

      it('should not display any error', () => {
        expect(screen.queryByText('Failed to update Break-in monitoring')).not.toBeInTheDocument();
      });
    });
  });

  describe('The disable telemetry button', () => {
    const monitoredVehicle: Vehicle = { ...fakeVehicle, sentry_mode_monitoring_enabled: true };

    beforeEach(() => {
      window.confirm = jest.fn().mockReturnValue(true);
    });

    describe('When the deletion fails with a server message', () => {
      const expectedMessage = 'Error deleting telemetry configuration';

      beforeEach(async () => {
        const outcome: VehicleActionOutcome = { success: false, message: expectedMessage };
        renderCard(monitoredVehicle, {
          onDeleteTelemetry: jest.fn().mockResolvedValue(outcome),
        });

        await clickAndSettle('Disable Telemetry');
      });

      it('should display the server message', () => {
        expect(screen.getByText(expectedMessage)).toBeInTheDocument();
      });
    });

    describe('When the deletion succeeds', () => {
      let onDeleteTelemetry: jest.Mock;

      beforeEach(async () => {
        onDeleteTelemetry = jest.fn().mockResolvedValue({ success: true });
        renderCard(monitoredVehicle, { onDeleteTelemetry });

        await clickAndSettle('Disable Telemetry');
      });

      it('should request the deletion', () => {
        expect(onDeleteTelemetry).toHaveBeenCalledWith(monitoredVehicle.vin);
      });

      it('should not display any error', () => {
        expect(screen.queryByText('Failed to disable telemetry')).not.toBeInTheDocument();
      });
    });
  });
});
