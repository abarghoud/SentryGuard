import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from './metrics';

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
