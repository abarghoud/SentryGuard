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

interface TypeSpec {
  fontSize: number;
  fontWeight: TextStyle['fontWeight'];
  letterSpacing: number;
  lineHeight: number;
}

const appleSpecs: Record<TextVariant, TypeSpec> = {
  [TextVariant.LargeTitle]: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: 0.4 },
  [TextVariant.Title1]: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: 0.36 },
  [TextVariant.Title2]: { fontSize: 22, lineHeight: 28, fontWeight: '700', letterSpacing: 0.35 },
  [TextVariant.Title3]: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: 0.38 },
  [TextVariant.Headline]: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.43 },
  [TextVariant.Body]: { fontSize: 17, lineHeight: 22, fontWeight: '400', letterSpacing: -0.43 },
  [TextVariant.Callout]: { fontSize: 16, lineHeight: 21, fontWeight: '400', letterSpacing: -0.31 },
  [TextVariant.Subhead]: { fontSize: 15, lineHeight: 20, fontWeight: '400', letterSpacing: -0.23 },
  [TextVariant.Footnote]: { fontSize: 13, lineHeight: 18, fontWeight: '400', letterSpacing: -0.08 },
  [TextVariant.Caption1]: { fontSize: 12, lineHeight: 16, fontWeight: '400', letterSpacing: 0 },
  [TextVariant.Caption2]: { fontSize: 11, lineHeight: 13, fontWeight: '400', letterSpacing: 0.07 },
};

const systemFont = Platform.select({ ios: undefined, default: 'System' });
const androidFontScale = 0.90;
const minimumReadableFontSize = 11;

export function scaleSpecForAndroid(spec: TypeSpec): TypeSpec {
  return {
    fontSize: Math.max(minimumReadableFontSize, Math.round(spec.fontSize * androidFontScale)),
    fontWeight: spec.fontWeight,
    letterSpacing: 0,
    lineHeight: Math.round(spec.lineHeight * androidFontScale),
  };
}

function resolvePlatformStyle(spec: TypeSpec): TextStyle {
  const platformSpec = Platform.OS === 'android' ? scaleSpecForAndroid(spec) : spec;
  return { fontFamily: systemFont, ...platformSpec };
}

export const typography: Record<TextVariant, TextStyle> = {
  [TextVariant.LargeTitle]: resolvePlatformStyle(appleSpecs[TextVariant.LargeTitle]),
  [TextVariant.Title1]: resolvePlatformStyle(appleSpecs[TextVariant.Title1]),
  [TextVariant.Title2]: resolvePlatformStyle(appleSpecs[TextVariant.Title2]),
  [TextVariant.Title3]: resolvePlatformStyle(appleSpecs[TextVariant.Title3]),
  [TextVariant.Headline]: resolvePlatformStyle(appleSpecs[TextVariant.Headline]),
  [TextVariant.Body]: resolvePlatformStyle(appleSpecs[TextVariant.Body]),
  [TextVariant.Callout]: resolvePlatformStyle(appleSpecs[TextVariant.Callout]),
  [TextVariant.Subhead]: resolvePlatformStyle(appleSpecs[TextVariant.Subhead]),
  [TextVariant.Footnote]: resolvePlatformStyle(appleSpecs[TextVariant.Footnote]),
  [TextVariant.Caption1]: resolvePlatformStyle(appleSpecs[TextVariant.Caption1]),
  [TextVariant.Caption2]: resolvePlatformStyle(appleSpecs[TextVariant.Caption2]),
};

export function textStyle(variant: TextVariant): TextStyle {
  return typography[variant];
}
