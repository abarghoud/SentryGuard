import { useWindowDimensions } from 'react-native';

import { TwoPaneLayout, resolveTwoPaneLayout } from './two-pane-layout';
import { useHorizontalScreenInsets } from './use-screen-inset';
import { useIsWideLayout } from './use-wide-layout';
import { useVerticalFold } from './vertical-fold';

export function useTwoPaneLayout(): TwoPaneLayout | null {
  const { width } = useWindowDimensions();
  const isWideLayout = useIsWideLayout();
  const verticalFold = useVerticalFold();
  const { paddingLeft, paddingRight } = useHorizontalScreenInsets();

  return resolveTwoPaneLayout({ isWideLayout, leftInset: paddingLeft, sceneWidth: width - paddingLeft - paddingRight, verticalFold });
}
