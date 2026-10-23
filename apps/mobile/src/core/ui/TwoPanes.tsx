import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { hairline } from '../design/metrics';
import { TwoPaneKind, TwoPaneLayout } from '../design/two-pane-layout';
import { useThemeColors } from '../theme';

interface TwoPanesProps {
  first: JSX.Element;
  layout: TwoPaneLayout;
  second: JSX.Element | null;
}

export function TwoPanes({ first, layout, second }: TwoPanesProps): JSX.Element {
  const colors = useThemeColors();
  const divider = layout.kind === TwoPaneKind.SideBySide ? { borderRightColor: colors.separator, borderRightWidth: hairline } : null;

  return (
    <View style={[styles.row, { backgroundColor: colors.systemGroupedBackground }]}>
      <View style={[{ width: layout.firstPaneWidth }, divider]}>{first}</View>
      <View style={{ width: layout.gutterWidth }} />
      <View style={styles.pane}>{second}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  pane: {
    flex: 1,
  },
  row: {
    flex: 1,
    flexDirection: 'row',
  },
});
