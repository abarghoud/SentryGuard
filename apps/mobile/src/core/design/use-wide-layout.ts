import { useWindowDimensions } from 'react-native';

const wideLayoutMinWidth = 768;

export function useIsWideLayout(): boolean {
  const { width } = useWindowDimensions();

  return width >= wideLayoutMinWidth;
}
