import { mock, MockProxy } from 'jest-mock-extended';

import { SecureStorageRequirements } from '../storage/secure-storage';
import { TokenStore } from './token-store';

describe('The TokenStore class', () => {
  const fakeToken = 'jwt-token';
  let mockStorage: MockProxy<SecureStorageRequirements>;
  let tokenStore: TokenStore;

  beforeEach(() => {
    mockStorage = mock<SecureStorageRequirements>();
    tokenStore = new TokenStore(mockStorage);
  });

  describe('The setToken() method', () => {
    describe('When the token changes', () => {
      const listener = jest.fn();

      beforeEach(() => {
        tokenStore.subscribe(listener);
        tokenStore.setToken(fakeToken);
      });

      it('should notify subscribers with the new token', () => {
        expect(listener).toHaveBeenCalledWith(fakeToken);
      });
    });

    describe('When the token is unchanged', () => {
      const listener = jest.fn();

      beforeEach(() => {
        tokenStore.setToken(fakeToken);
        tokenStore.subscribe(listener);
        tokenStore.setToken(fakeToken);
      });

      it('should not notify subscribers again', () => {
        expect(listener).not.toHaveBeenCalled();
      });
    });
  });

  describe('The hasToken() method', () => {
    describe('When a token is set', () => {
      beforeEach(() => {
        tokenStore.setToken(fakeToken);
      });

      it('should return true', () => {
        expect(tokenStore.hasToken()).toBe(true);
      });
    });

    describe('When no token is set', () => {
      it('should return false', () => {
        expect(tokenStore.hasToken()).toBe(false);
      });
    });
  });

  describe('The loadFromStorage() method', () => {
    describe('When a token is stored', () => {
      let result: string | null;

      beforeEach(async () => {
        mockStorage.getItem.mockResolvedValue(fakeToken);
        result = await tokenStore.loadFromStorage();
      });

      it('should return the stored token', () => {
        expect(result).toBe(fakeToken);
      });

      it('should expose the token through getToken()', () => {
        expect(tokenStore.getToken()).toBe(fakeToken);
      });
    });
  });

  describe('The store() method', () => {
    describe('When storing a token', () => {
      beforeEach(async () => {
        await tokenStore.store(fakeToken);
      });

      it('should persist the token through the storage', () => {
        expect(mockStorage.setItem).toHaveBeenCalledWith('sentryguard.jwt', fakeToken);
      });
    });
  });

  describe('The clear() method', () => {
    describe('When clearing the token', () => {
      beforeEach(async () => {
        tokenStore.setToken(fakeToken);
        await tokenStore.clear();
      });

      it('should remove the token from storage', () => {
        expect(mockStorage.removeItem).toHaveBeenCalledWith('sentryguard.jwt');
      });

      it('should reset the in-memory token', () => {
        expect(tokenStore.getToken()).toBeNull();
      });
    });
  });

  describe('The isDemo() method', () => {
    describe('When the token is demo-token', () => {
      beforeEach(() => {
        tokenStore.setToken('demo-token');
      });

      it('should return true', () => {
        expect(tokenStore.isDemo()).toBe(true);
      });
    });

    describe('When the token is not demo-token', () => {
      beforeEach(() => {
        tokenStore.setToken(fakeToken);
      });

      it('should return false', () => {
        expect(tokenStore.isDemo()).toBe(false);
      });
    });
  });
});
