import { Children, isValidElement, useState, type JSX, type ReactNode, type Ref } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewInstance,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { FoldDivision, FoldSections, findBalancedSplitCount, isFrameAcrossFold, splitSectionsAtFold } from '../design/fold';
import { useHorizontalScreenInsets } from '../design/use-screen-inset';
import { useVerticalFold } from '../design/vertical-fold';

interface FoldAwareScrollViewProps extends ScrollViewProps {
  children: ReactNode;
  scrollViewRef?: Ref<ScrollViewInstance>;
}

interface FoldColumnsProps extends FoldAwareScrollViewProps {
  division: FoldDivision;
  leftInset: number;
}

interface SectionMeasurement {
  firstCount: number | null;
  heights: Record<number, number>;
  signature: string;
}

export function FoldAwareScrollView({ children, scrollViewRef, ...scrollViewProps }: FoldAwareScrollViewProps): JSX.Element {
  const verticalFold = useVerticalFold();
  const { paddingLeft } = useHorizontalScreenInsets();
  const [width, setWidth] = useState<number | null>(null);

  return (
    <View style={styles.fill} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {verticalFold && width !== null && isFrameAcrossFold({ width, x: paddingLeft }, verticalFold) ? (
        <FoldColumns {...scrollViewProps} division={verticalFold} leftInset={paddingLeft} scrollViewRef={scrollViewRef}>
          {children}
        </FoldColumns>
      ) : (
        <ScrollView {...scrollViewProps} ref={scrollViewRef}>
          {children}
        </ScrollView>
      )}
    </View>
  );
}

function FoldColumns({ children, contentContainerStyle, division, leftInset, scrollViewRef, ...scrollViewProps }: FoldColumnsProps): JSX.Element {
  const [rowX, setRowX] = useState<number | null>(null);
  const sectionGap = { gap: readGap(contentContainerStyle) };
  const { first, second } = useBalancedSections(children, sectionGap.gap, `columns:${division.x}:${division.width}`);

  return (
    <ScrollView {...scrollViewProps} ref={scrollViewRef} contentContainerStyle={[contentContainerStyle, styles.fullWidth]}>
      <View style={styles.row} onLayout={(event) => setRowX(leftInset + event.nativeEvent.layout.x)}>
        <View style={[sectionGap, rowX === null ? styles.fill : { width: division.x - rowX }]}>{first}</View>
        <View style={{ width: division.width }} />
        <View style={[sectionGap, styles.fill]}>{second}</View>
      </View>
    </ScrollView>
  );
}

function useBalancedSections(children: ReactNode, gap: number, foldSignature: string): FoldSections<JSX.Element> {
  const sections = Children.toArray(children);
  const signature = [foldSignature, ...sections.map(readSectionKey)].join('|');
  const [measurement, setMeasurement] = useState<SectionMeasurement>({ firstCount: null, heights: {}, signature });

  if (measurement.signature !== signature) {
    setMeasurement({ firstCount: null, heights: {}, signature });
  }

  const measuredSections = sections.map((section, index) => (
    <View
      key={readSectionKey(section, index)}
      onLayout={(event) => setMeasurement((current) => recordSectionHeight(current, signature, sections.length, index, event.nativeEvent.layout.height, gap))}
    >
      {section}
    </View>
  ));
  const settledFirstCount = measurement.signature === signature ? measurement.firstCount : null;

  return splitSectionsAtFold(measuredSections, settledFirstCount ?? Math.ceil(sections.length / 2));
}

function recordSectionHeight(current: SectionMeasurement, signature: string, sectionCount: number, index: number, height: number, gap: number): SectionMeasurement {
  if (current.signature !== signature || current.firstCount !== null) {
    return current;
  }

  const heights = { ...current.heights, [index]: height };
  const isComplete = Object.keys(heights).length === sectionCount;
  const sectionHeights = Array.from({ length: sectionCount }, (_value, sectionIndex) => heights[sectionIndex]);

  return { firstCount: isComplete ? findBalancedSplitCount(sectionHeights, gap) : null, heights, signature };
}

function readSectionKey(section: ReturnType<typeof Children.toArray>[number], index: number): string {
  return isValidElement(section) && section.key !== null ? String(section.key) : String(index);
}

function readGap(contentContainerStyle: StyleProp<ViewStyle>): number {
  const gap = StyleSheet.flatten(contentContainerStyle)?.gap;

  return typeof gap === 'number' ? gap : 0;
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  fullWidth: {
    maxWidth: '100%',
  },
  row: {
    flexDirection: 'row',
  },
});
