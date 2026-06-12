jest.mock('react-native', () => ({
  Platform: { select: (obj: any) => obj.ios || obj.default },
  Pressable: 'Pressable',
  StyleSheet: { create: (styles: any) => styles },
  Text: 'Text',
  View: 'View',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

jest.mock('../theme', () => ({
  useThemeColors: () => ({
    secondaryLabel: 'secondaryLabelColor',
  }),
}));

jest.mock('./AppText', () => ({
  AppText: 'AppText',
}));

jest.mock('./Icon', () => ({
  Icon: 'Icon',
}));

import { maskVin } from './VinMask';

describe('The maskVin() function', () => {
  const vin = '5YJ3E1EB8KF123456';
  const expectedMaskedVin = '5YJ••••••••••••••';

  describe('When adapting a standard 17-character VIN', () => {
    it('should keep the first 3 characters and mask the rest with 14 bullets', () => {
      expect(maskVin(vin)).toBe(expectedMaskedVin);
    });
  });

  describe('When the VIN is too short', () => {
    it('should return the original string untouched', () => {
      expect(maskVin('5Y')).toBe('5Y');
    });
  });
});
