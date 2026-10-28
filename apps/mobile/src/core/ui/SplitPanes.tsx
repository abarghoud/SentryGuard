import type { JSX } from 'react';
import { StyleSheet, View } from 'react-native';

import { hairline } from '../design/metrics';
import { TwoPaneKind, TwoPaneLayout } from '../design/two-pane-layout';
import { useTwoPaneLayout } from '../design/use-two-pane-layout';
import { useThemeColors } from '../theme';

interface SplitPanesProps {
  first: JSX.Element;
  second: JSX.Element | null;
  single?: JSX.Element;
}

interface PanesProps {
  first: JSX.Element;
  layout: TwoPaneLayout;
  second: JSX.Element | null;
}

export function SplitPanes({ first, second, single = first }: SplitPanesProps): JSX.Element {
  const layout = useTwoPaneLayout();

  return layout ? <Panes first={first} layout={layout} second={second} /> : single;
}

function Panes({ first, layout, second }: PanesProps): JSX.Element {
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
