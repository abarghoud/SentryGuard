import { readFileSync } from 'fs';
import { join } from 'path';

describe('The translation catalogues', () => {
  const readCatalogue = (language: string): Record<string, string> =>
    JSON.parse(readFileSync(join(__dirname, `${language}.json`), 'utf-8'));

  const en = readCatalogue('en');
  const fr = readCatalogue('fr');
  const englishKeys = Object.keys(en);
  const frenchKeys = Object.keys(fr);

  describe('When comparing the English and French catalogues', () => {
    it('should not declare a key that the French catalogue is missing', () => {
      expect(englishKeys.filter((key) => !frenchKeys.includes(key))).toStrictEqual([]);
    });

    it('should not declare a key that the English catalogue is missing', () => {
      expect(frenchKeys.filter((key) => !englishKeys.includes(key))).toStrictEqual([]);
    });

    it('should declare the keys in the same order', () => {
      expect(frenchKeys).toStrictEqual(englishKeys);
    });
  });

  describe('When looking for an empty translation', () => {
    it('should not leave any value blank', () => {
      const catalogues: Record<string, Record<string, string>> = { en, fr };
      const blankEntries = Object.entries(catalogues).flatMap(([language, catalogue]) =>
        Object.entries(catalogue)
          .filter(([, value]) => value.trim() === '')
          .map(([key]) => `${language}:${key}`)
      );

      expect(blankEntries).toStrictEqual([]);
    });
  });
});
