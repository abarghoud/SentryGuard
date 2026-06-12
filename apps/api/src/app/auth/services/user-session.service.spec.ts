import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { UserSessionService } from './user-session.service';
import { UserSession } from '../../../entities/user-session.entity';
import { User } from '../../../entities/user.entity';

describe('The UserSessionService class', () => {
  let service: UserSessionService;
  let mockUserSessionRepository: MockProxy<Repository<UserSession>>;

  const mockQueryBuilder = {
    andWhere: jest.fn(),
    execute: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    where: jest.fn(),
    whereInIds: jest.fn(),
  };

  const fakeUser = {
    userId: 'user-123',
    token_revoked_at: null,
  } as User;

  const fakeSession = {
    id: 'session-123',
    userId: 'user-123',
    jwt_hash: 'hash-abc',
    expires_at: new Date(Date.now() + 3600000),
    revoked_at: null,
    user: fakeUser,
  } as UserSession;

  beforeEach(async () => {
    mockUserSessionRepository = mock<Repository<UserSession>>();
    mockQueryBuilder.update.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.set.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.where.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.andWhere.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.whereInIds.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.execute.mockResolvedValue(undefined as any);
    mockUserSessionRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSessionService,
        {
          provide: getRepositoryToken(UserSession),
          useValue: mockUserSessionRepository,
        },
      ],
    }).compile();

    service = module.get<UserSessionService>(UserSessionService);
  });

  describe('The createSession() method', () => {
    beforeEach(() => {
      mockUserSessionRepository.create.mockReturnValue(fakeSession);
      mockUserSessionRepository.save.mockResolvedValue(fakeSession);
    });

    it('should create and save a new user session', async () => {
      const expiresAt = new Date();
      await service.createSession('user-123', 'raw-jwt', expiresAt);

      expect(mockUserSessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          jwt_hash: service.hashJwt('raw-jwt'),
        })
      );
    });
  });

  describe('The findSession() method', () => {
    beforeEach(() => {
      mockUserSessionRepository.findOne.mockResolvedValue(fakeSession);
    });

    it('should find user session by hashed token', async () => {
      const result = await service.findSession('raw-jwt');

      expect(mockUserSessionRepository.findOne).toHaveBeenCalledWith({
        relations: { user: true },
        where: { jwt_hash: service.hashJwt('raw-jwt') },
      });
      expect(result).toBe(fakeSession);
    });
  });

  describe('The validateSession() method', () => {
    describe('When the session is active and not expired', () => {
      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue(fakeSession);
      });

      it('should return the validated session', async () => {
        const result = await service.validateSession('raw-jwt');

        expect(result).toBe(fakeSession);
      });
    });

    describe('When the session is missing', () => {
      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue(null);
      });

      it('should return null', async () => {
        const result = await service.validateSession('raw-jwt');

        expect(result).toBeNull();
      });
    });

    describe('When the session is revoked', () => {
      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue({
          ...fakeSession,
          revoked_at: new Date(),
        });
      });

      it('should return null', async () => {
        const result = await service.validateSession('raw-jwt');

        expect(result).toBeNull();
      });
    });

    describe('When the session is expired', () => {
      beforeEach(() => {
        mockUserSessionRepository.findOne.mockResolvedValue({
          ...fakeSession,
          expires_at: new Date(Date.now() - 3600000),
        });
      });

      it('should return null', async () => {
        const result = await service.validateSession('raw-jwt');

        expect(result).toBeNull();
      });
    });
  });

  describe('The touchSession() method', () => {
    beforeEach(() => {
      mockUserSessionRepository.save.mockResolvedValue(fakeSession);
    });

    it('should update the last_used_at field', async () => {
      const session = { ...fakeSession } as UserSession;
      await service.touchSession(session);

      expect(mockUserSessionRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'session-123',
          last_used_at: expect.any(Date),
        })
      );
    });
  });

  describe('The updateSession() method', () => {
    beforeEach(() => {
      mockUserSessionRepository.save.mockResolvedValue(fakeSession);
    });

    it('should save the session updates to the repository', async () => {
      const session = { ...fakeSession } as UserSession;
      await service.updateSession(session);

      expect(mockUserSessionRepository.save).toHaveBeenCalledWith(session);
    });
  });

  describe('The revokeSession() method', () => {
    describe('When the session exists and belongs to the user', () => {
      let session: UserSession;

      beforeEach(() => {
        session = { ...fakeSession } as UserSession;
        mockUserSessionRepository.findOne.mockResolvedValue(session);
        mockUserSessionRepository.save.mockResolvedValue(session);
      });

      it('should mark the session as revoked', async () => {
        await service.revokeSession('user-123', 'raw-jwt');

        expect(mockUserSessionRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({
            revoked_at: expect.any(Date),
          })
        );
      });
    });
  });

  describe('The revokeAllSessions() method', () => {
    it('should run a query builder update to revoke all sessions', async () => {
      await service.revokeAllSessions('user-123');

      expect(mockQueryBuilder.update).toHaveBeenCalledWith(UserSession);
      expect(mockQueryBuilder.set).toHaveBeenCalledWith({ revoked_at: expect.any(Date) });
    });
  });

  describe('The enforceSessionLimits() method', () => {
    describe('When the user is under the active session limit', () => {
      beforeEach(() => {
        mockUserSessionRepository.find.mockResolvedValue([
          fakeSession,
          fakeSession,
        ]);
      });

      it('should do nothing', async () => {
        await service.enforceSessionLimits('user-123');

        expect(mockUserSessionRepository.createQueryBuilder).not.toHaveBeenCalled();
      });
    });

    describe('When the user exceeds the active session limit', () => {
      beforeEach(() => {
        mockUserSessionRepository.find.mockResolvedValue([
          { id: 's1' } as UserSession,
          { id: 's2' } as UserSession,
          { id: 's3' } as UserSession,
          { id: 's4' } as UserSession,
          { id: 's5' } as UserSession,
          { id: 's6' } as UserSession,
          { id: 's7' } as UserSession,
        ]);
      });

      it('should revoke oldest sessions over limit', async () => {
        await service.enforceSessionLimits('user-123');

        expect(mockQueryBuilder.update).toHaveBeenCalledWith(UserSession);
        expect(mockQueryBuilder.whereInIds).toHaveBeenCalledWith(['s6', 's7']);
      });
    });
  });
});
