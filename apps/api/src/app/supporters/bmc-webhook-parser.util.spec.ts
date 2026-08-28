import * as crypto from 'crypto';
import { SupporterType } from '../../entities/supporter.entity';
import {
  BmcWebhookPayload,
  verifyWebhookSignature,
} from './bmc-webhook-parser.util';

describe('The bmc-webhook-parser utility', () => {
  const originalSecret = process.env.BUYMEACOFFEE_WEBHOOK_SECRET;

  afterEach(() => {
    process.env.BUYMEACOFFEE_WEBHOOK_SECRET = originalSecret;
  });

  describe('The verifyWebhookSignature() function', () => {
    describe('When signature matches the HMAC of the raw body', () => {
      it('should return true', () => {
        const secret = 'test-secret-key-123';
        process.env.BUYMEACOFFEE_WEBHOOK_SECRET = secret;
        const rawBody = JSON.stringify({ type: 'donation.created' });
        const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

        expect(verifyWebhookSignature(rawBody, signature)).toBe(true);
      });
    });

    describe('When signature does not match', () => {
      it('should return false', () => {
        process.env.BUYMEACOFFEE_WEBHOOK_SECRET = 'secret';
        expect(verifyWebhookSignature('{"foo":"bar"}', 'invalid-hex-signature')).toBe(false);
      });
    });
  });

  describe('The BmcWebhookPayload class', () => {
    describe('When instantiated with a donation payload', () => {
      it('should transform into a complete active donation supporter entity', () => {
        const payload = {
          type: 'donation.created',
          data: {
            transaction_id: 'txn-123',
            supporter_name: 'John Doe',
            supporter_email: 'john@example.com',
            coffee_count: 5,
            support_note: 'Awesome project!',
            support_created_on: '2024-01-01T12:00:00Z',
          },
        };

        const result = new BmcWebhookPayload(payload).toSupporter();

        expect(result).toStrictEqual({
          external_id: 'txn-123',
          name: 'John Doe',
          email: 'john@example.com',
          coffees: 5,
          type: SupporterType.Donation,
          is_active: true,
          message: 'Awesome project!',
          support_date: new Date('2024-01-01T12:00:00Z'),
        });
      });
    });

    describe('When instantiated with a membership payload', () => {
      it('should transform into an active membership supporter entity with calculated coffees', () => {
        const payload = {
          type: 'membership.started',
          data: {
            psp_id: 'sub-456',
            supporter_name: 'Alice',
            amount: 5,
            status: 'active',
            started_at: 1719825600,
          },
        };

        const result = new BmcWebhookPayload(payload).toSupporter();

        expect(result).toStrictEqual({
          external_id: 'sub-456',
          name: 'Alice',
          email: null,
          coffees: 2,
          type: SupporterType.Membership,
          is_active: true,
          message: null,
          support_date: new Date(1719825600 * 1000),
        });
      });
    });

    describe('When instantiated with a cancellation or refund event', () => {
      it('should mark isActive as false', () => {
        const payload = {
          type: 'membership.cancelled',
          data: {
            psp_id: 'sub-456',
            status: 'canceled',
          },
        };

        const result = new BmcWebhookPayload(payload).toSupporter();

        expect(result.is_active).toBe(false);
      });
    });
  });
});
