import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useContext } from 'react';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from './metrics';

interface HorizontalScreenInsets {
  paddingLeft: number;
  paddingRight: number;
}

interface TabPaneInsets {
  isInsideTabs: boolean;
  paddingBottom: number;
  paddingTop: number;
}

/**
 * Top padding for tab screens that render their own large title.
 *
 * On iOS the navigation/scroll view handles the inset via
 * `contentInsetAdjustmentBehavior="automatic"`, so this returns 0. On Android
 * there is no automatic inset, so we push the content below the status bar.
 */
export function useScreenTopInset(): number {
  const insets = useSafeAreaInsets();

  return Platform.OS === 'android' ? insets.top + spacing.sm : 0;
}

export function useHorizontalScreenInsets(): HorizontalScreenInsets {
  const insets = useSafeAreaInsets();

  return { paddingLeft: insets.left, paddingRight: insets.right };
}

export function useTabPaneInsets(): TabPaneInsets {
  const tabBarHeight = useContext(BottomTabBarHeightContext);
  const topInset = useScreenTopInset();

  return tabBarHeight === undefined
    ? { isInsideTabs: false, paddingBottom: 0, paddingTop: 0 }
    : { isInsideTabs: true, paddingBottom: tabBarHeight, paddingTop: topInset };
}
