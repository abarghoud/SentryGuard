import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { UserSession } from '../../entities/user-session.entity';
import { JwtPayload, JwtStrategy } from './jwt.strategy';

describe('The JwtStrategy class', () => {
  let strategy: JwtStrategy;
  let mockUserSessionRepository: MockProxy<Repository<UserSession>>;

  const fakeUserId = 'user-123';
  const fakePayload: JwtPayload = { sub: fakeUserId, email: 'test@example.com' };
  const fakeRequest = {
    headers: {
      authorization: 'Bearer valid-token',
    },
  };
  const fakeUser = {
    userId: fakeUserId,
    email: 'test@example.com',
    token_revoked_at: null,
  } as User;
  const fakeSession = {
    expires_at: new Date(Date.now() + 86400000),
    revoked_at: null,
    user: fakeUser,
  } as UserSession;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-unit-tests';
    mockUserSessionRepository = mock<Repository<UserSession>>();
    strategy = new JwtStrategy(mockUserSessionRepository);
  });

  describe('The validate() method', () => {
    describe('When the session is not found', () => {
      const expectedError = 'User not found';
      let act: () => Promise<User>;

      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue(null);
        act = () => strategy.validate(fakeRequest, fakePayload);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When the session is revoked', () => {
      const expectedError = 'Token expired or invalid';
      let act: () => Promise<User>;

      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue({
          ...fakeSession,
          revoked_at: new Date(),
        });
        act = () => strategy.validate(fakeRequest, fakePayload);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When the user tokens are revoked', () => {
      const expectedError = 'Token expired or invalid';
      let act: () => Promise<User>;

      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue({
          ...fakeSession,
          user: { ...fakeUser, token_revoked_at: new Date() } as User,
        });
        act = () => strategy.validate(fakeRequest, fakePayload);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When the session is expired', () => {
      const expectedError = 'Token expired or invalid';
      let act: () => Promise<User>;

      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue({
          ...fakeSession,
          expires_at: new Date(Date.now() - 1000),
        });
        act = () => strategy.validate(fakeRequest, fakePayload);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When the session user does not match the payload', () => {
      const expectedError = 'Token expired or invalid';
      let act: () => Promise<User>;

      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue({
          ...fakeSession,
          user: { ...fakeUser, userId: 'other-user' } as User,
        });
        act = () => strategy.validate(fakeRequest, fakePayload);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When token is valid', () => {
      let result: User;

      beforeEach(async () => {
        mockUserSessionRepository.findOne.mockResolvedValue(fakeSession);
        result = await strategy.validate(fakeRequest, fakePayload);
      });

      it('should return the user', () => {
        expect(result).toStrictEqual(fakeUser);
      });
    });
  });
});
