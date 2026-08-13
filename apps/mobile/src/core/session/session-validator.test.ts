import { mock, MockProxy } from 'jest-mock-extended';

import { ApiClientRequirements } from '../api/api-client';
import { TokenStoreRequirements } from '../api/token-store';
import { SessionValidator } from './session-validator';

describe('The SessionValidator class', () => {
  let mockApiClient: MockProxy<ApiClientRequirements>;
  let mockTokenStore: MockProxy<TokenStoreRequirements>;
  let sessionValidator: SessionValidator;

  beforeEach(() => {
    mockApiClient = mock<ApiClientRequirements>();
    mockTokenStore = mock<TokenStoreRequirements>();
    sessionValidator = new SessionValidator(mockApiClient, mockTokenStore);
  });

  describe('The ensureSessionValid() method', () => {
    describe('When there is no stored token', () => {
      beforeEach(async () => {
        mockTokenStore.getToken.mockReturnValue(null);
        await sessionValidator.ensureSessionValid();
      });

      it('should not call the API client', () => {
        expect(mockApiClient.request).not.toHaveBeenCalled();
      });
    });

    describe('When there is a stored token', () => {
      beforeEach(async () => {
        mockTokenStore.getToken.mockReturnValue('valid-token');
        await sessionValidator.ensureSessionValid();
      });

      it('should call the language endpoint to validate the session', () => {
        expect(mockApiClient.request).toHaveBeenCalledWith('/user/language');
      });
    });
  });
});
