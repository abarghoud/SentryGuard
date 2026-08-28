import * as crypto from 'crypto';
import { UnauthorizedException } from '@nestjs/common';
import { mock, MockProxy } from 'jest-mock-extended';
import { Repository } from 'typeorm';
import { Supporter, SupporterType } from '../../entities/supporter.entity';
import { SupportersService } from './supporters.service';

describe('The SupportersService class', () => {
  let service: SupportersService;
  let supporterRepository: MockProxy<Repository<Supporter>>;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    supporterRepository = mock<Repository<Supporter>>();
    service = new SupportersService(supporterRepository);
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('The getPublicSupporters() method', () => {
    describe('When supporters and subscribers exist in the database', () => {
      it('should partition and format public subscribers and supporters properly', async () => {
        const mockSupporter1: Supporter = {
          id: 'sub-1',
          external_id: 'ext-sub-1',
          name: 'Alice',
          email: 'alice@example.com',
          coffees: 2,
          type: SupporterType.Membership,
          is_active: true,
          message: null,
          support_date: new Date('2024-01-01T10:00:00Z'),
          created_at: new Date('2024-01-01T10:00:00Z'),
          updated_at: new Date('2024-01-01T10:00:00Z'),
        };

        const mockSupporter2: Supporter = {
          id: 'don-1',
          external_id: 'ext-don-1',
          name: 'Bob',
          email: 'bob@example.com',
          coffees: 3,
          type: SupporterType.Donation,
          is_active: true,
          message: 'Keep up the great work!',
          support_date: new Date('2024-01-02T10:00:00Z'),
          created_at: new Date('2024-01-02T10:00:00Z'),
          updated_at: new Date('2024-01-02T10:00:00Z'),
        };

        supporterRepository.find.mockResolvedValue([mockSupporter1, mockSupporter2]);

        const result = await service.getPublicSupporters();

        expect(result).toStrictEqual({
          subscribers: [],
          supporters: [
            {
              id: 'don-1',
              name: 'Bob',
              coffees: 3,
              isSubscriber: false,
              monthlyCoffees: undefined,
              supportDate: '2024-01-02T10:00:00.000Z',
              message: 'Keep up the great work!',
            },
            {
              id: 'sub-1',
              name: 'Alice',
              coffees: 2,
              isSubscriber: true,
              monthlyCoffees: 2,
              supportDate: '2024-01-01T10:00:00.000Z',
              message: undefined,
            },
          ],
          totalCoffeesCount: 5,
          hasActiveSupporters: true,
        });
      });
    });

    describe('When a user has made multiple separate donations', () => {
      it('should aggregate donations by email and sum the coffee counts', async () => {
        const donation1: Supporter = {
          id: 'don-1',
          name: 'Yvan',
          email: 'yvan@example.com',
          coffees: 10,
          type: SupporterType.Donation,
          is_active: true,
          support_date: new Date('2024-01-01T10:00:00Z'),
          created_at: new Date(),
          updated_at: new Date(),
        };

        const donation2: Supporter = {
          id: 'don-2',
          name: 'Yvan',
          email: 'yvan@example.com',
          coffees: 25,
          type: SupporterType.Donation,
          is_active: true,
          support_date: new Date('2024-02-01T10:00:00Z'),
          created_at: new Date(),
          updated_at: new Date(),
        };

        supporterRepository.find.mockResolvedValue([donation1, donation2]);

        const result = await service.getPublicSupporters();

        expect(result.supporters).toStrictEqual([
          {
            id: 'don-2',
            name: 'Yvan',
            coffees: 35,
            isSubscriber: false,
            monthlyCoffees: undefined,
            supportDate: '2024-02-01T10:00:00.000Z',
            message: undefined,
          },
        ]);
      });
    });

    describe('When the database has no records', () => {
      it('should return empty collections with hasActiveSupporters set to false', async () => {
        supporterRepository.find.mockResolvedValue([]);

        const result = await service.getPublicSupporters();

        expect(result).toStrictEqual({
          subscribers: [],
          supporters: [],
          totalCoffeesCount: 0,
          hasActiveSupporters: false,
        });
      });
    });
  });

  describe('The handleWebhook() method', () => {
    const testSecret = 'test-signing-secret';

    function signPayload(payload: Record<string, unknown>): { rawBody: string; signature: string } {
      process.env.BUYMEACOFFEE_WEBHOOK_SECRET = testSecret;
      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', testSecret).update(rawBody).digest('hex');
      return { rawBody, signature };
    }

    describe('When a valid donation.created event is received', () => {
      it('should parse and persist the new donation with active status', async () => {
        const payload = {
          type: 'donation.created',
          data: {
            transaction_id: 'pi_12345',
            supporter_name: 'Charlie',
            supporter_email: 'charlie@example.com',
            coffee_count: 5,
            support_note: 'Awesome project!',
            created_at: 1719825600,
          },
        };
        const { rawBody, signature } = signPayload(payload);

        supporterRepository.findOne.mockResolvedValue(null);
        supporterRepository.create.mockImplementation((data) => data as Supporter);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.name).toBe('Charlie');
        expect(result.coffees).toBe(5);
        expect(result.type).toBe(SupporterType.Donation);
        expect(result.is_active).toBe(true);
        expect(result.message).toBe('Awesome project!');
        expect(result.support_date).toStrictEqual(new Date(1719825600 * 1000));
        expect(supporterRepository.save).toHaveBeenCalled();
      });
    });

    describe('When a donation.refunded event is received', () => {
      it('should mark the donation as inactive', async () => {
        const payload = {
          type: 'donation.refunded',
          data: {
            transaction_id: 'pi_12345',
            supporter_name: 'Charlie',
            status: 'refunded',
            refunded: 'true',
          },
        };
        const { rawBody, signature } = signPayload(payload);

        const existing: Supporter = {
          id: 'don-1',
          external_id: 'pi_12345',
          name: 'Charlie',
          coffees: 5,
          type: SupporterType.Donation,
          is_active: true,
          support_date: new Date(),
          created_at: new Date(),
          updated_at: new Date(),
        };

        supporterRepository.findOne.mockResolvedValue(existing);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.is_active).toBe(false);
        expect(supporterRepository.save).toHaveBeenCalledWith(
          expect.objectContaining({ external_id: 'pi_12345', is_active: false })
        );
      });
    });

    describe('When a membership.started event is received', () => {
      it('should parse and persist the membership properly', async () => {
        const payload = {
          type: 'membership.started',
          data: {
            psp_id: 'sub_999',
            supporter_name: 'David',
            supporter_email: 'david@example.com',
            amount: 5,
            status: 'active',
            started_at: 1719825600,
          },
        };
        const { rawBody, signature } = signPayload(payload);

        supporterRepository.findOne.mockResolvedValue(null);
        supporterRepository.create.mockImplementation((data) => data as Supporter);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.name).toBe('David');
        expect(result.type).toBe(SupporterType.Membership);
        expect(result.is_active).toBe(true);
        expect(result.external_id).toBe('sub_999');
      });
    });

    describe('When a membership.cancelled event is received', () => {
      it('should mark the membership as inactive', async () => {
        const payload = {
          type: 'membership.cancelled',
          data: {
            psp_id: 'sub_999',
            supporter_name: 'David',
            status: 'canceled',
            canceled: 'true',
          },
        };
        const { rawBody, signature } = signPayload(payload);

        supporterRepository.findOne.mockResolvedValue(null);
        supporterRepository.create.mockImplementation((data) => data as Supporter);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.is_active).toBe(false);
      });
    });

    describe('When a membership webhook arrives for an existing CSV-imported member without external_id', () => {
      it('should reconcile by email and update the existing record with the new external_id', async () => {
        const existingCsvMember: Supporter = {
          id: 'csv-member-uuid',
          external_id: null,
          name: 'David',
          email: 'david@example.com',
          coffees: 1,
          type: SupporterType.Membership,
          is_active: true,
          support_date: new Date('2024-01-01T00:00:00Z'),
          created_at: new Date('2024-01-01T00:00:00Z'),
          updated_at: new Date('2024-01-01T00:00:00Z'),
        };

        const payload = {
          type: 'membership.cancelled',
          data: {
            psp_id: 'sub_new_bmc_id',
            supporter_email: 'david@example.com',
            status: 'canceled',
          },
        };
        const { rawBody, signature } = signPayload(payload);

        supporterRepository.findOne
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(existingCsvMember);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.id).toBe('csv-member-uuid');
        expect(result.external_id).toBe('sub_new_bmc_id');
        expect(result.is_active).toBe(false);
      });
    });

    describe('When a membership.paused event is received', () => {
      it('should mark the membership as inactive', async () => {
        const payload = {
          type: 'membership.paused',
          data: {
            psp_id: 'sub_999',
            status: 'paused',
            paused: 'true',
          },
        };
        const { rawBody, signature } = signPayload(payload);

        supporterRepository.findOne.mockResolvedValue(null);
        supporterRepository.create.mockImplementation((data) => data as Supporter);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.is_active).toBe(false);
      });
    });

    describe('When a recurring_donation.started event is received', () => {
      it('should categorize the recurring donation as Membership', async () => {
        const payload = {
          type: 'recurring_donation.started',
          data: {
            psp_id: 'sub_888',
            supporter_name: 'Emma',
            status: 'active',
          },
        };
        const { rawBody, signature } = signPayload(payload);

        supporterRepository.findOne.mockResolvedValue(null);
        supporterRepository.create.mockImplementation((data) => data as Supporter);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.type).toBe(SupporterType.Membership);
        expect(result.is_active).toBe(true);
      });
    });

    describe('When a recurring_donation.cancelled event is received', () => {
      it('should mark the recurring donation as inactive', async () => {
        const payload = {
          type: 'recurring_donation.cancelled',
          data: {
            psp_id: 'sub_888',
            status: 'canceled',
          },
        };
        const { rawBody, signature } = signPayload(payload);

        supporterRepository.findOne.mockResolvedValue(null);
        supporterRepository.create.mockImplementation((data) => data as Supporter);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.is_active).toBe(false);
      });
    });

    describe('When an extra_purchase.refunded event is received', () => {
      it('should mark the extra purchase as inactive', async () => {
        const payload = {
          type: 'extra_purchase.refunded',
          data: {
            transaction_id: 'pi_extra_1',
            status: 'refunded',
          },
        };
        const { rawBody, signature } = signPayload(payload);

        supporterRepository.findOne.mockResolvedValue(null);
        supporterRepository.create.mockImplementation((data) => data as Supporter);
        supporterRepository.save.mockImplementation(async (data) => data as Supporter);

        const result = await service.handleWebhook(payload, rawBody, signature);

        expect(result.is_active).toBe(false);
      });
    });

    describe('When webhook signature is invalid or missing', () => {
      it('should throw an UnauthorizedException when signature is invalid', async () => {
        process.env.BUYMEACOFFEE_WEBHOOK_SECRET = 'secret';

        await expect(
          service.handleWebhook({ test: true }, '{"test":true}', 'invalid_sig')
        ).rejects.toThrow(UnauthorizedException);
      });

      it('should throw an UnauthorizedException when signature is missing', async () => {
        process.env.BUYMEACOFFEE_WEBHOOK_SECRET = 'secret';

        await expect(
          service.handleWebhook({ test: true }, '{"test":true}', undefined)
        ).rejects.toThrow(UnauthorizedException);
      });
    });
  });
});

