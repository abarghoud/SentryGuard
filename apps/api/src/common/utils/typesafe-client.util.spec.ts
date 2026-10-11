import { TypeSafeClient } from '@typesafe-ai/sdk';
import { getTypeSafeClient } from './typesafe-client.util';

describe('The typesafe-client utility', () => {
  describe('The getTypeSafeClient() function', () => {
    const originalApiKey = process.env.TYPESAFE_API_KEY;

    afterEach(() => {
      process.env.TYPESAFE_API_KEY = originalApiKey;
    });

    describe('When TYPESAFE_API_KEY is missing', () => {
      it('should return null', () => {
        delete process.env.TYPESAFE_API_KEY;

        expect(getTypeSafeClient()).toBeNull();
      });
    });

    describe('When TYPESAFE_API_KEY is set', () => {
      it('should return a TypeSafeClient', () => {
        process.env.TYPESAFE_API_KEY = 'test-api-key';

        expect(getTypeSafeClient()).toBeInstanceOf(TypeSafeClient);
      });
    });

    describe('When called twice with the same key', () => {
      it('should return the same instance', () => {
        process.env.TYPESAFE_API_KEY = 'test-api-key';

        expect(getTypeSafeClient()).toBe(getTypeSafeClient());
      });
    });

    describe('When the key changes between calls', () => {
      it('should return a new instance', () => {
        process.env.TYPESAFE_API_KEY = 'first-key';
        const first = getTypeSafeClient();
        process.env.TYPESAFE_API_KEY = 'second-key';

        expect(getTypeSafeClient()).not.toBe(first);
      });
    });
  });
});
