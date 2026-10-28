export interface FoldDivision {
  height: number;
  width: number;
  x: number;
  y: number;
}

export function isVerticalFold(division: FoldDivision): boolean {
  return division.height > division.width;
}

export function selectFoldToLayOut(divisions: FoldDivision[], isHalfOpen: boolean): FoldDivision | null {
  return isHalfOpen ? (divisions.find(isVerticalFold) ?? null) : null;
}
