jest.mock('react-native', () => {
  const platform: { OS: string; select: (spec: Record<string, unknown>) => unknown } = {
    OS: 'ios',
    select: (spec) => (platform.OS in spec ? spec[platform.OS] : spec.default),
  };
  return {
    Alert: { alert: jest.fn() },
    AppState: { addEventListener: jest.fn(() => ({ remove: jest.fn() })) },
    Platform: platform,
  };
});
jest.mock('expo-linking', () => ({
  parse: jest.fn(() => ({ queryParams: {} })),
  createURL: jest.fn(() => 'sentryguard://callback'),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  openURL: jest.fn(() => Promise.resolve()),
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
}));
jest.mock('../../core/api', () => ({
  tokenStore: { store: jest.fn(() => Promise.resolve()) },
  virtualKeyStore: { resolveUrl: jest.fn() },
}));
jest.mock('../../features/auth/di', () => ({
  getTeslaScopeChangeUrlUseCase: { execute: jest.fn() },
}));

import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { AppState, Platform } from 'react-native';

import { tokenStore } from '../../core/api';
import { getTeslaScopeChangeUrlUseCase } from '../../features/auth/di';
import { OffensiveResponse, Vehicle } from '../../features/vehicles/domain/entities';
import {
  canConfigureCounterMeasures,
  requestVehicleCommandsScope,
  resolveVehicleAlertSoundId,
  shouldShowBreakInDetection,
} from './vehicle-detail.helpers';
import { AlertSoundTarget, TranslationFunction } from './vehicle-detail.types';

describe('The requestVehicleCommandsScope() function', () => {
  const translate: TranslationFunction = (key) => key;
  const fakeLoginUrl = 'https://auth.tesla.com/oauth2/authorize?scope=vehicle_cmds';
  const fakeToken = 'scope-jwt';
  const fakeCallbackUrl = `sentryguard://callback#token=${fakeToken}`;

  const flushMicrotasks = async (): Promise<void> => {
    for (let iteration = 0; iteration < 5; iteration += 1) {
      await Promise.resolve();
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getTeslaScopeChangeUrlUseCase.execute as jest.Mock).mockResolvedValue({ url: fakeLoginUrl });
    (tokenStore.store as jest.Mock).mockResolvedValue(undefined);
  });

  describe('When the platform opens an authentication session and the user authorizes', () => {
    beforeEach(async () => {
      Platform.OS = 'ios';
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'success', url: fakeCallbackUrl });

      await requestVehicleCommandsScope(translate);
    });

    it('should store the granted token', () => {
      expect(tokenStore.store).toHaveBeenCalledWith(fakeToken);
    });
  });

  describe('When the platform opens an authentication session and the user cancels', () => {
    let act: () => Promise<void>;

    beforeEach(() => {
      Platform.OS = 'ios';
      (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });
      act = () => requestVehicleCommandsScope(translate);
    });

    it('should throw a cancellation error', async () => {
      await expect(act()).rejects.toThrow('vehicle.scopeCancelled');
    });
  });

  describe('When Android opens the external browser and the redirect returns a token', () => {
    let urlHandler: (event: { url: string }) => void;

    beforeEach(async () => {
      Platform.OS = 'android';
      (Linking.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        if (event === 'url') {
          urlHandler = handler;
        }
        return { remove: jest.fn() };
      });

      const pending = requestVehicleCommandsScope(translate);
      await flushMicrotasks();
      urlHandler({ url: fakeCallbackUrl });
      await pending;
    });

    it('should open the external browser with the login url', () => {
      expect(Linking.openURL).toHaveBeenCalledWith(fakeLoginUrl);
    });

    it('should store the granted token', () => {
      expect(tokenStore.store).toHaveBeenCalledWith(fakeToken);
    });
  });

  describe('When Android opens the external browser and the user returns without authorizing', () => {
    let appStateHandler: (state: string) => void;
    let act: () => Promise<void>;

    beforeEach(() => {
      jest.useFakeTimers();
      Platform.OS = 'android';
      (AppState.addEventListener as jest.Mock).mockImplementation((event, handler) => {
        appStateHandler = handler;
        return { remove: jest.fn() };
      });

      act = async () => {
        const pending = requestVehicleCommandsScope(translate);
        await flushMicrotasks();
        appStateHandler('active');
        jest.advanceTimersByTime(1000);
        return pending;
      };
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should throw a cancellation error', async () => {
      await expect(act()).rejects.toThrow('vehicle.scopeCancelled');
    });
  });
});

describe('The resolveVehicleAlertSoundId() function', () => {
  describe('When the vehicle defines a sound for each alert type', () => {
    const vehicle = {
      break_in_alert_sound: 'klaxon_alarm.wav',
      sentry_alert_sound: 'cyber_pulse.wav',
    } as Vehicle;

    it('should return the sentry sound for the Sentry target', () => {
      expect(resolveVehicleAlertSoundId(vehicle, AlertSoundTarget.Sentry)).toBe('cyber_pulse.wav');
    });

    it('should return the break-in sound for the BreakIn target', () => {
      expect(resolveVehicleAlertSoundId(vehicle, AlertSoundTarget.BreakIn)).toBe('klaxon_alarm.wav');
    });
  });

  describe('When the vehicle has no stored sound', () => {
    it('should fall back to the phone default sound id', () => {
      expect(resolveVehicleAlertSoundId({} as Vehicle, AlertSoundTarget.Sentry)).toBe('default');
    });
  });
});

describe('The canConfigureCounterMeasures() function', () => {
  const monitoredVehicle = { break_in_monitoring_enabled: true } as Vehicle;

  describe('When break-in monitoring is on and the vehicle commands are authorized', () => {
    it('should allow it', () => {
      expect(canConfigureCounterMeasures(monitoredVehicle, true)).toBe(true);
    });
  });

  describe('When the vehicle commands are not authorized', () => {
    it('should refuse it', () => {
      expect(canConfigureCounterMeasures(monitoredVehicle, false)).toBe(false);
    });
  });

  describe('When break-in monitoring is off', () => {
    it('should refuse it', () => {
      expect(canConfigureCounterMeasures({ break_in_monitoring_enabled: false } as Vehicle, true)).toBe(false);
    });
  });
});

describe('The shouldShowBreakInDetection() function', () => {
  const buildMonitoredVehicle = (counterMeasures: Partial<Vehicle>): Vehicle =>
    ({ break_in_monitoring_enabled: true, ...counterMeasures }) as Vehicle;

  describe('When the offensive response is enabled on a configurable vehicle', () => {
    it('should show the settings', () => {
      const vehicle = buildMonitoredVehicle({ break_in_auto_sentry_mode_enabled: false, break_in_offensive_response: OffensiveResponse.Fart });

      expect(shouldShowBreakInDetection(vehicle, true)).toBe(true);
    });
  });

  describe('When only auto Sentry Mode is enabled', () => {
    it('should show the settings', () => {
      const vehicle = buildMonitoredVehicle({ break_in_auto_sentry_mode_enabled: true, break_in_offensive_response: OffensiveResponse.Disabled });

      expect(shouldShowBreakInDetection(vehicle, true)).toBe(true);
    });
  });

  describe('When neither the offensive response nor auto Sentry Mode is enabled', () => {
    it('should hide the settings', () => {
      const vehicle = buildMonitoredVehicle({ break_in_auto_sentry_mode_enabled: false, break_in_offensive_response: OffensiveResponse.Disabled });

      expect(shouldShowBreakInDetection(vehicle, true)).toBe(false);
    });
  });

  describe('When the vehicle stores no counter-measure setting', () => {
    it('should hide the settings', () => {
      expect(shouldShowBreakInDetection(buildMonitoredVehicle({}), true)).toBe(false);
    });
  });

  describe('When the offensive response holds an unknown value', () => {
    it('should hide the settings', () => {
      const vehicle = buildMonitoredVehicle({ break_in_auto_sentry_mode_enabled: false, break_in_offensive_response: 'LASERS' });

      expect(shouldShowBreakInDetection(vehicle, true)).toBe(false);
    });
  });

  describe('When the vehicle commands are not authorized', () => {
    it('should hide the settings', () => {
      const vehicle = { break_in_monitoring_enabled: true, break_in_offensive_response: OffensiveResponse.Honk } as Vehicle;

      expect(shouldShowBreakInDetection(vehicle, false)).toBe(false);
    });
  });
});
