import { findBalancedSplitCount, isFrameAcrossFold, isVerticalFold, selectFoldToLayOut, splitSectionsAtFold } from './fold';

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

describe('The isFrameAcrossFold() function', () => {
  const fold = { height: 669, width: 40, x: 455.5, y: 0 };

  describe('When the view spans the whole screen', () => {
    it('should report it across the fold', () => {
      expect(isFrameAcrossFold({ width: 867, x: 0 }, fold)).toBe(true);
    });
  });

  describe('When the view sits left of the fold', () => {
    it('should not report it across the fold', () => {
      expect(isFrameAcrossFold({ width: 455.5, x: 0 }, fold)).toBe(false);
    });
  });

  describe('When the view sits right of the fold', () => {
    it('should not report it across the fold', () => {
      expect(isFrameAcrossFold({ width: 372, x: 495.5 }, fold)).toBe(false);
    });
  });
});

describe('The splitSectionsAtFold() function', () => {
  describe('When some sections go before the fold', () => {
    it('should keep their order on both sides', () => {
      expect(splitSectionsAtFold(['a', 'b', 'c', 'd'], 3)).toStrictEqual({ first: ['a', 'b', 'c'], second: ['d'] });
    });
  });

  describe('When every section goes before the fold', () => {
    it('should leave the second side empty', () => {
      expect(splitSectionsAtFold(['a'], 1)).toStrictEqual({ first: ['a'], second: [] });
    });
  });
});

describe('The findBalancedSplitCount() function', () => {
  const gap = 16;

  describe('When there is no section', () => {
    it('should put nothing before the fold', () => {
      expect(findBalancedSplitCount([], gap)).toBe(0);
    });
  });

  describe('When there is a single section', () => {
    it('should put it before the fold', () => {
      expect(findBalancedSplitCount([300], gap)).toBe(1);
    });
  });

  describe('When a short header comes before two cards', () => {
    it('should keep the first card with the header', () => {
      expect(findBalancedSplitCount([40, 36, 100, 100], gap)).toBe(3);
    });
  });

  describe('When the sections are all the same height', () => {
    it('should put half of them on each side', () => {
      expect(findBalancedSplitCount([80, 80, 80, 80], gap)).toBe(2);
    });
  });

  describe('When one tall section dominates', () => {
    it('should end the first side right after it', () => {
      expect(findBalancedSplitCount([40, 600, 60], gap)).toBe(2);
    });
  });

  describe('When two splits are equally balanced', () => {
    it('should keep the earlier one', () => {
      expect(findBalancedSplitCount([100, 50, 100], 0)).toBe(1);
    });
  });
});

