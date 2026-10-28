export enum BreakInSensitivity {
  RepeatedPulls = 'repeated_pulls',
  SinglePull = 'single_pull',
}

export const BREAK_IN_REACTION_DELAYS_SECONDS: readonly number[] = [3, 5, 10, 20, 30, 60];

export const DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS = 5;

export const DEFAULT_BREAK_IN_SENSITIVITY = BreakInSensitivity.SinglePull;

export interface BreakInDetection {
  reactionDelaySeconds: number;
  sensitivity: BreakInSensitivity;
}

export interface BreakInDetectionFields {
  break_in_reaction_delay_seconds?: number;
  break_in_sensitivity?: BreakInSensitivity;
}

const isKnownSensitivity = (value: unknown): value is BreakInSensitivity =>
  Object.values(BreakInSensitivity).includes(value as BreakInSensitivity);

const isKnownReactionDelay = (value: unknown): value is number =>
  BREAK_IN_REACTION_DELAYS_SECONDS.includes(value as number);

export const readBreakInDetection = (
  vehicle: BreakInDetectionFields
): BreakInDetection => ({
  reactionDelaySeconds: isKnownReactionDelay(vehicle.break_in_reaction_delay_seconds)
    ? vehicle.break_in_reaction_delay_seconds
    : DEFAULT_BREAK_IN_REACTION_DELAY_SECONDS,
  sensitivity: isKnownSensitivity(vehicle.break_in_sensitivity)
    ? vehicle.break_in_sensitivity
    : DEFAULT_BREAK_IN_SENSITIVITY,
});

export const toBreakInDetectionFields = (
  breakInDetection: BreakInDetection
): Required<BreakInDetectionFields> => ({
  break_in_reaction_delay_seconds: breakInDetection.reactionDelaySeconds,
  break_in_sensitivity: breakInDetection.sensitivity,
});
