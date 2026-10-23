import { isVerticalFold, selectFoldToLayOut } from './fold';

describe('The isVerticalFold() function', () => {
  describe('When the fold runs from top to bottom', () => {
    it('should report a vertical fold', () => {
      expect(isVerticalFold({ height: 669, width: 40, x: 455.5, y: 0 })).toBe(true);
    });
  });

  describe('When the fold runs from side to side', () => {
    it('should not report a vertical fold', () => {
      expect(isVerticalFold({ height: 40, width: 669, x: 0, y: 455.5 })).toBe(false);
    });
  });
});

describe('The selectFoldToLayOut() function', () => {
  const verticalFold = { height: 669, width: 40, x: 455.5, y: 0 };
  const horizontalFold = { height: 40, width: 669, x: 0, y: 455.5 };

  describe('When a vertical fold is half open', () => {
    it('should lay the screen out around it', () => {
      expect(selectFoldToLayOut([verticalFold], true)).toBe(verticalFold);
    });
  });

  describe('When a vertical fold lies flat', () => {
    it('should not lay the screen out around it', () => {
      expect(selectFoldToLayOut([verticalFold], false)).toBeNull();
    });
  });

  describe('When only a horizontal fold is half open', () => {
    it('should not lay the screen out around it', () => {
      expect(selectFoldToLayOut([horizontalFold], true)).toBeNull();
    });
  });
});
