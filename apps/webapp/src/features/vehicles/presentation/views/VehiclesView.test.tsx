import { render, screen } from '@testing-library/react';
import { VehiclesView } from './VehiclesView';
import { Vehicle } from '../../domain/entities';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const createVehicle = (overrides: Partial<Vehicle>): Vehicle =>
  ({
    break_in_monitoring_enabled: false,
    id: 'vehicle-1',
    sentry_mode_monitoring_enabled: false,
    vin: 'VIN-1',
    ...overrides,
  }) as Vehicle;

describe('The VehiclesView component', () => {
  const defaultProps = {
    isLoading: false,
    error: null,
    onRefresh: jest.fn(),
    onConfigureTelemetry: jest.fn(),
    onDeleteTelemetry: jest.fn(),
    onToggleBreakInMonitoring: jest.fn(),
    onUpdateBreakInOffensive: jest.fn(),
    onUpdateAutoSentry: jest.fn(),
  };

  const renderView = (vehicles: Vehicle[]) => {
    return render(<VehiclesView vehicles={vehicles} {...defaultProps} />);
  };

  const getGlobalSuccessBannerText = () =>
    screen.queryByText('Your Tesla account is successfully paired with a virtual key.');
  const getGlobalWarningBannerText = () =>
    screen.queryByText('You need to pair your Tesla account with a virtual key to use SentryGuard.');

  describe('Global Virtual Key Banner logic', () => {
    describe('When there are no vehicles', () => {
      it('should hide both global banners', () => {
        renderView([]);

        expect(getGlobalSuccessBannerText()).not.toBeInTheDocument();
        expect(getGlobalWarningBannerText()).not.toBeInTheDocument();
      });
    });

    describe('When there is 1 legacy vehicle (not required)', () => {
      it('should hide both global banners (vehicle is ignored)', () => {
        const legacyVehicle = createVehicle({
          key_paired: false,
          vehicle_command_protocol_required: false,
        });

        renderView([legacyVehicle]);

        expect(getGlobalSuccessBannerText()).not.toBeInTheDocument();
        expect(getGlobalWarningBannerText()).not.toBeInTheDocument();
      });
    });

    describe('When there is 1 modern vehicle (required) and it is NOT paired', () => {
      it('should show the global warning banner', () => {
        const modernVehicle = createVehicle({
          key_paired: false,
          vehicle_command_protocol_required: true,
        });

        renderView([modernVehicle]);

        expect(getGlobalSuccessBannerText()).not.toBeInTheDocument();
        expect(getGlobalWarningBannerText()).toBeInTheDocument();
      });
    });

    describe('When there is 1 modern vehicle (required) and it IS paired', () => {
      it('should show the global success banner', () => {
        const modernVehicle = createVehicle({
          key_paired: true,
          vehicle_command_protocol_required: true,
        });

        renderView([modernVehicle]);

        expect(getGlobalSuccessBannerText()).toBeInTheDocument();
        expect(getGlobalWarningBannerText()).not.toBeInTheDocument();
      });
    });

    describe('When there is 1 legacy (not required) and 1 modern (required, NOT paired)', () => {
      it('should show the global warning banner (legacy vehicle is ignored)', () => {
        const legacyVehicle = createVehicle({
          key_paired: false,
          vehicle_command_protocol_required: false,
          vin: 'VIN-1',
        });
        const modernVehicle = createVehicle({
          key_paired: false,
          vehicle_command_protocol_required: true,
          vin: 'VIN-2',
        });

        renderView([legacyVehicle, modernVehicle]);

        expect(getGlobalSuccessBannerText()).not.toBeInTheDocument();
        expect(getGlobalWarningBannerText()).toBeInTheDocument();
      });
    });

    describe('When there is 1 legacy (not required) and 1 modern (required, IS paired)', () => {
      it('should show the global success banner (legacy vehicle is ignored)', () => {
        const legacyVehicle = createVehicle({
          key_paired: false,
          vehicle_command_protocol_required: false,
          vin: 'VIN-1',
        });
        const modernVehicle = createVehicle({
          key_paired: true,
          vehicle_command_protocol_required: true,
          vin: 'VIN-2',
        });

        renderView([legacyVehicle, modernVehicle]);

        expect(getGlobalSuccessBannerText()).toBeInTheDocument();
        expect(getGlobalWarningBannerText()).not.toBeInTheDocument();
      });
    });

    describe('When there are 2 modern vehicles (1 paired, 1 NOT paired)', () => {
      it('should hide both global banners (mixed state relies on individual cards)', () => {
        const pairedModern = createVehicle({
          key_paired: true,
          vehicle_command_protocol_required: true,
          vin: 'VIN-1',
        });
        const unpairedModern = createVehicle({
          key_paired: false,
          vehicle_command_protocol_required: true,
          vin: 'VIN-2',
        });

        renderView([pairedModern, unpairedModern]);

        expect(getGlobalSuccessBannerText()).not.toBeInTheDocument();
        expect(getGlobalWarningBannerText()).not.toBeInTheDocument();
      });
    });
  });
});
