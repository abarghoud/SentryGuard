import { resolveActiveRouteName } from './navigation-logging';

describe('The resolveActiveRouteName() function', () => {
  describe('When the state has a single active route', () => {
    it('should return the route name', () => {
      expect(resolveActiveRouteName({ index: 0, routes: [{ name: 'Auth' }] })).toBe('Auth');
    });
  });

  describe('When the active route nests another navigator', () => {
    it('should return the deepest active route name', () => {
      const state = {
        index: 0,
        routes: [
          {
            name: 'Main',
            state: { index: 1, routes: [{ name: 'Tabs' }, { name: 'VehicleDetail' }] },
          },
        ],
      };

      expect(resolveActiveRouteName(state)).toBe('VehicleDetail');
    });
  });

  describe('When the nested state has no routes yet', () => {
    it('should fall back to the parent route name', () => {
      const state = {
        index: 0,
        routes: [{ name: 'Main', state: { routes: [] } }],
      };

      expect(resolveActiveRouteName(state)).toBe('Main');
    });
  });

  describe('When the state is undefined', () => {
    it('should return null', () => {
      expect(resolveActiveRouteName(undefined)).toBeNull();
    });
  });
});
