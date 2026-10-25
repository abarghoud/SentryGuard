import { FoldDivision } from './fold';

const loadReadFoldDivisions = (nativeModule: unknown): (() => Promise<FoldDivision[]>) => {
  let readFoldDivisions: () => Promise<FoldDivision[]> = async () => [];

  jest.isolateModules(() => {
    jest.doMock('expo', () => ({ requireOptionalNativeModule: () => nativeModule }));
    readFoldDivisions = jest.requireActual<typeof import('./fold-division-module')>('./fold-division-module').readFoldDivisions;
  });

  return readFoldDivisions;
};

describe('The readFoldDivisions() function', () => {
  const division = { height: 669, width: 40, x: 455.5, y: 0 };

  describe('When the native module is not linked', () => {
    it('should report no fold', async () => {
      expect(await loadReadFoldDivisions(null)()).toStrictEqual([]);
    });
  });

  describe('When the native module reports a fold', () => {
    it('should return it', async () => {
      expect(await loadReadFoldDivisions({ getFoldDivisions: async () => [division] })()).toStrictEqual([division]);
    });
  });

  describe('When the native module fails', () => {
    it('should report no fold', async () => {
      expect(await loadReadFoldDivisions({ getFoldDivisions: async () => Promise.reject(new Error('no window')) })()).toStrictEqual([]);
    });
  });
});
