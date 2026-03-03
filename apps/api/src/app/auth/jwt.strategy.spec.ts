import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { JwtPayload, JwtStrategy } from './jwt.strategy';

describe('The JwtStrategy class', () => {
  let strategy: JwtStrategy;
  let mockUserRepository: MockProxy<Repository<User>>;

  const fakeUserId = 'user-123';
  const fakePayload: JwtPayload = { sub: fakeUserId, email: 'test@example.com' };
  const fakeUser = {
    userId: fakeUserId,
    email: 'test@example.com',
    jwt_token: 'valid-token',
    jwt_expires_at: new Date(Date.now() + 86400000),
    token_revoked_at: undefined,
  } as User;

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-secret-for-unit-tests';
    mockUserRepository = mock<Repository<User>>();
    strategy = new JwtStrategy(mockUserRepository);
  });

  describe('The validate() method', () => {
    describe('When user is not found', () => {
      const expectedError = 'User not found';
      let act: () => Promise<User>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue(null);
        act = () => strategy.validate(fakePayload);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When jwt_token is null', () => {
      const expectedError = 'Token expired or invalid';
      let act: () => Promise<User>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue({ ...fakeUser, jwt_token: null });
        act = () => strategy.validate(fakePayload);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When token is expired', () => {
      const expectedError = 'Token expired or invalid';
      let act: () => Promise<User>;

      beforeEach(() => {
        mockUserRepository.findOne.mockResolvedValue({ ...fakeUser, jwt_expires_at: new Date(Date.now() - 1000) });
        act = () => strategy.validate(fakePayload);
      });

      it('should throw UnauthorizedException', async () => {
        await expect(act()).rejects.toThrow(expectedError);
      });
    });

    describe('When token is valid', () => {
      let result: User;

      beforeEach(async () => {
        mockUserRepository.findOne.mockResolvedValue(fakeUser);
        result = await strategy.validate(fakePayload);
      });

      it('should return the user', () => {
        expect(result).toStrictEqual(fakeUser);
      });
    });
  });
});