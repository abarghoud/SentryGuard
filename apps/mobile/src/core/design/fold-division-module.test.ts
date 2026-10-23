jest.mock('expo', () => ({
  requireOptionalNativeModule: jest.fn(() => null),
}));

import { readFoldDivisions } from './fold-division-module';

describe('The readFoldDivisions() function', () => {
  describe('When the native module is not linked', () => {
    it('should report no fold', async () => {
      expect(await readFoldDivisions()).toStrictEqual([]);
    });
  });
});
