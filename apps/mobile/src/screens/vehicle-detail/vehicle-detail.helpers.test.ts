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
import { Vehicle } from '../../features/vehicles/domain/entities';
import { requestVehicleCommandsScope, resolveVehicleAlertSoundId } from './vehicle-detail.helpers';
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
