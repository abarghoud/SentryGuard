import type { JSX, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';
import { StyleSheet, View } from 'react-native';

import { hairline, radius, spacing } from '../design/metrics';
import { TextVariant } from '../design/typography';
import { useThemeColors } from '../theme';
import { AppText } from './AppText';

interface ListSectionProps {
  badge?: string;
  children: ReactNode;
  footer?: string;
  header?: string;
}

export function ListSection({ badge, children, footer, header }: ListSectionProps): JSX.Element {
  const colors = useThemeColors();
  const rows = Children.toArray(children).filter(isValidElement);

  return (
    <View style={styles.section}>
      {header ? (
        <View style={styles.header}>
          <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel}>
            {header.toUpperCase()}
          </AppText>
          {badge ? (
            <View style={[styles.badge, { backgroundColor: colors.systemBlue }]}>
              <AppText variant={TextVariant.Caption2} color={colors.onAccent} style={styles.badgeText}>
                {badge.toUpperCase()}
              </AppText>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={[styles.group, { backgroundColor: colors.secondarySystemGroupedBackground }]}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: colors.separator }]} /> : null}
            {row}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <AppText variant={TextVariant.Footnote} color={colors.secondaryLabel} style={styles.footer}>
          {footer}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
  },
  group: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  section: {
    width: '100%',
  },
  separator: {
    height: hairline,
    marginLeft: spacing.lg,
  },
});
