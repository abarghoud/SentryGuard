export interface FoldDivision {
  height: number;
  width: number;
  x: number;
  y: number;
}

export interface FoldSections<T> {
  first: T[];
  second: T[];
}

export interface HorizontalFrame {
  width: number;
  x: number;
}

export function isVerticalFold(division: FoldDivision): boolean {
  return division.height > division.width;
}

export function selectFoldToLayOut(divisions: FoldDivision[], isHalfOpen: boolean): FoldDivision | null {
  return isHalfOpen ? (divisions.find(isVerticalFold) ?? null) : null;
}

export function isFrameAcrossFold(frame: HorizontalFrame, fold: FoldDivision): boolean {
  return fold.x > frame.x && fold.x + fold.width < frame.x + frame.width;
}

export function splitSectionsAtFold<T>(sections: T[], firstCount: number): FoldSections<T> {
  return { first: sections.slice(0, firstCount), second: sections.slice(firstCount) };
}

export function findBalancedSplitCount(sectionHeights: number[], gap: number): number {
  const candidateCounts = sectionHeights.map((_height, index) => index + 1);

  return candidateCounts.reduce(
    (bestCount, count) => (measureImbalance(sectionHeights, count, gap) < measureImbalance(sectionHeights, bestCount, gap) ? count : bestCount),
    Math.min(sectionHeights.length, 1),
  );
}

function measureImbalance(sectionHeights: number[], firstCount: number, gap: number): number {
  const { first, second } = splitSectionsAtFold(sectionHeights, firstCount);

  return Math.abs(measureStackHeight(first, gap) - measureStackHeight(second, gap));
}

function measureStackHeight(heights: number[], gap: number): number {
  return heights.reduce((sum, height) => sum + height, 0) + gap * Math.max(heights.length - 1, 0);
}
