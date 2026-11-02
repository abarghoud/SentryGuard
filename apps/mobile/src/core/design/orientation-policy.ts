export enum OrientationPolicy {
  Free = 'free',
  PortraitOnly = 'portrait-only',
}

export interface WindowSize {
  height: number;
  width: number;
}

const LARGE_SCREEN_SMALLEST_SIDE = 600;

export function resolveOrientationPolicy({ height, width }: WindowSize): OrientationPolicy {
  return Math.min(height, width) >= LARGE_SCREEN_SMALLEST_SIDE ? OrientationPolicy.Free : OrientationPolicy.PortraitOnly;
}
