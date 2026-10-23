import { TwoPaneKind, resolveTwoPaneLayout } from './two-pane-layout';

describe('The resolveTwoPaneLayout() function', () => {
  const verticalFold = { height: 669, width: 40, x: 455.5, y: 0 };

  describe('When a vertical fold cuts the screen', () => {
    it('should put the panes on both sides of the fold', () => {
      expect(resolveTwoPaneLayout({ isWideLayout: true, leftInset: 0, sceneWidth: 867, verticalFold })).toStrictEqual({
        firstPaneWidth: 455.5,
        gutterWidth: 40,
        kind: TwoPaneKind.AtFold,
      });
    });
  });

  describe('When the screen starts after a side safe area', () => {
    it('should end the first pane at the fold all the same', () => {
      expect(resolveTwoPaneLayout({ isWideLayout: true, leftInset: 84, sceneWidth: 867, verticalFold })).toMatchObject({ firstPaneWidth: 371.5 });
    });
  });

  describe('When a wide screen has no fold', () => {
    it('should cut the scene into two equal halves', () => {
      expect(resolveTwoPaneLayout({ isWideLayout: true, leftInset: 0, sceneWidth: 1376, verticalFold: null })).toStrictEqual({
        firstPaneWidth: 688,
        gutterWidth: 0,
        kind: TwoPaneKind.SideBySide,
      });
    });
  });

  describe('When a narrow screen has no fold', () => {
    it('should keep a single column', () => {
      expect(resolveTwoPaneLayout({ isWideLayout: false, leftInset: 0, sceneWidth: 402, verticalFold: null })).toBeNull();
    });
  });
});
