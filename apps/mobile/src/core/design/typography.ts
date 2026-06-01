import { Platform, type TextStyle } from 'react-native';

export enum TextVariant {
  LargeTitle = 'largeTitle',
  Title1 = 'title1',
  Title2 = 'title2',
  Title3 = 'title3',
  Headline = 'headline',
  Body = 'body',
  Callout = 'callout',
  Subhead = 'subhead',
  Footnote = 'footnote',
  Caption1 = 'caption1',
  Caption2 = 'caption2',
}

const systemFont = Platform.select({ ios: undefined, default: 'System' });

export const typography: Record<TextVariant, TextStyle> = {
  [TextVariant.LargeTitle]: { fontFamily: systemFont, fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4 },
  [TextVariant.Title1]: { fontFamily: systemFont, fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  [TextVariant.Title2]: { fontFamily: systemFont, fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
  [TextVariant.Title3]: { fontFamily: systemFont, fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  [TextVariant.Headline]: { fontFamily: systemFont, fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.43 },
  [TextVariant.Body]: { fontFamily: systemFont, fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.43 },
  [TextVariant.Callout]: { fontFamily: systemFont, fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.31 },
  [TextVariant.Subhead]: { fontFamily: systemFont, fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.23 },
  [TextVariant.Footnote]: { fontFamily: systemFont, fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  [TextVariant.Caption1]: { fontFamily: systemFont, fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  [TextVariant.Caption2]: { fontFamily: systemFont, fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: 0.07 },
};

export function textStyle(variant: TextVariant): TextStyle {
  return typography[variant];
}
