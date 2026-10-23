import { FoldDivision } from './fold';

export enum TwoPaneKind {
  AtFold = 'at-fold',
  SideBySide = 'side-by-side',
}

export interface TwoPaneLayout {
  firstPaneWidth: number;
  gutterWidth: number;
  kind: TwoPaneKind;
}

export interface TwoPaneScreen {
  isWideLayout: boolean;
  leftInset: number;
  sceneWidth: number;
  verticalFold: FoldDivision | null;
}

export function resolveTwoPaneLayout({ isWideLayout, leftInset, sceneWidth, verticalFold }: TwoPaneScreen): TwoPaneLayout | null {
  if (verticalFold) {
    return { firstPaneWidth: verticalFold.x - leftInset, gutterWidth: verticalFold.width, kind: TwoPaneKind.AtFold };
  }

  return isWideLayout ? { firstPaneWidth: sceneWidth / 2, gutterWidth: 0, kind: TwoPaneKind.SideBySide } : null;
}
