import * as vehiclesDomain from '@sentryguard/vehicles-domain';

import {
  BREAK_IN_REACTION_DELAYS_SECONDS,
  BreakInSensitivity,
  DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS,
  DEFAULT_BREAK_IN_SENSITIVITY,
} from './break-in-sensitivity.enum';

describe('The API break-in detection rules', () => {
  it('should accept the same sensitivities as the mobile app', () => {
    expect(Object.values(BreakInSensitivity)).toStrictEqual(Object.values(vehiclesDomain.BreakInSensitivity));
  });

  it('should accept the same reaction delays as the mobile app', () => {
    expect([...BREAK_IN_REACTION_DELAYS_SECONDS]).toStrictEqual([...vehiclesDomain.BREAK_IN_REACTION_DELAYS_SECONDS]);
  });

  it('should default to the same reaction delay as the mobile app', () => {
    expect(DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS).toStrictEqual(vehiclesDomain.DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS);
  });

  it('should default to the same sensitivity as the mobile app', () => {
    expect(DEFAULT_BREAK_IN_SENSITIVITY).toStrictEqual(vehiclesDomain.DEFAULT_BREAK_IN_SENSITIVITY);
  });
});
