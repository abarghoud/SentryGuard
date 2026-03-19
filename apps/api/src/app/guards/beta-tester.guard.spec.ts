import { mock, MockProxy } from 'jest-mock-extended';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { HttpArgumentsHost } from '@nestjs/common/interfaces/features/arguments-host.interface';
import { ErrorCode } from '@sentryguard/beta-domain';
import { BetaTesterGuard } from './beta-tester.guard';
import { User } from '../../entities/user.entity';

describe('The BetaTesterGuard class', () => {
  let guard: BetaTesterGuard;
  const fakeUserId = 'user-123';
  const fakeUser: User = {
    userId: fakeUserId,
    email: 'test@example.com',
    full_name: 'Test User',
    access_token: 'encrypted-token',
    refresh_token: 'encrypted-refresh',
    expires_at: new Date(Date.now() + 86400000),
    is_beta_tester: false,
    debug_messages: false,
    preferred_language: 'en',
    onboarding_completed: true,
    onboarding_skipped: false,
  } as User;

  beforeEach(() => {
    guard = new BetaTesterGuard();
  });

  describe('The canActivate() method', () => {
    let mockExecutionContext: MockProxy<ExecutionContext>;
    let mockHttpArgumentsHost: MockProxy<HttpArgumentsHost>;

    describe('When user is not authenticated', () => {
      const expectedError = ErrorCode.BETA_TESTER_ONLY;
      let act: () => boolean;

      beforeEach(() => {
        mockHttpArgumentsHost = mock<HttpArgumentsHost>();
        mockHttpArgumentsHost.getRequest.mockReturnValue({ user: null });
        mockExecutionContext = mock<ExecutionContext>();
        mockExecutionContext.switchToHttp.mockReturnValue(mockHttpArgumentsHost);
        act = () => guard.canActivate(mockExecutionContext);
      });

      it('should throw ForbiddenException', () => {
        expect(act).toThrow(ForbiddenException);
        expect(act).toThrow(expectedError);
      });
    });

    describe('When user is not a beta tester', () => {
      const expectedError = ErrorCode.BETA_TESTER_ONLY;
      let act: () => boolean;

      beforeEach(() => {
        mockHttpArgumentsHost = mock<HttpArgumentsHost>();
        mockHttpArgumentsHost.getRequest.mockReturnValue({ user: { ...fakeUser, is_beta_tester: false } });
        mockExecutionContext = mock<ExecutionContext>();
        mockExecutionContext.switchToHttp.mockReturnValue(mockHttpArgumentsHost);
        act = () => guard.canActivate(mockExecutionContext);
      });

      it('should throw ForbiddenException', () => {
        expect(act).toThrow(ForbiddenException);
        expect(act).toThrow(expectedError);
      });
    });

    describe('When user is a beta tester', () => {
      let result: boolean;

      beforeEach(() => {
        mockHttpArgumentsHost = mock<HttpArgumentsHost>();
        mockHttpArgumentsHost.getRequest.mockReturnValue({ user: { ...fakeUser, is_beta_tester: true } });
        mockExecutionContext = mock<ExecutionContext>();
        mockExecutionContext.switchToHttp.mockReturnValue(mockHttpArgumentsHost);
        result = guard.canActivate(mockExecutionContext);
      });

      it('should return true', () => {
        expect(result).toBe(true);
      });
    });
  });
});
