export enum BreakInSensitivity {
  RepeatedPulls = 'repeated_pulls',
  SinglePull = 'single_pull',
}

export const DEFAULT_BREAK_IN_SENSITIVITY = BreakInSensitivity.SinglePull;

export const BREAK_IN_REACTION_DELAYS_SECONDS = [3, 5, 10, 20, 30, 60] as const;

export const DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS = 5;
