import * as crypto from 'crypto';
import { Supporter, SupporterType } from '../../entities/supporter.entity';
import {
  isPrivateSupporter,
  sanitizeMessage,
  sanitizeName,
} from './supporter-sanitizer.util';

export function verifyWebhookSignature(rawBody: string, signature?: string): boolean {
  const secret = process.env.BUYMEACOFFEE_WEBHOOK_SECRET;
  if (!secret || !signature) {
    return false;
  }

  const calculated = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  const signatureBuffer = Buffer.from(signature, 'hex');
  const calculatedBuffer = Buffer.from(calculated, 'hex');

  if (signatureBuffer.length !== calculatedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(signatureBuffer, calculatedBuffer);
}

export class BmcWebhookPayload {
  private readonly eventType: string;
  private readonly data: Record<string, unknown>;
  private readonly isPrivate: boolean;

  constructor(payload: Record<string, unknown>) {
    this.eventType = String(payload['type'] || '');
    this.data = (payload['data'] || payload['response'] || payload) as Record<string, unknown>;
    this.isPrivate = isPrivateSupporter(this.data) || isPrivateSupporter(payload);
  }

  public toSupporter(): Partial<Supporter> {
    return {
      external_id: this.resolveExternalId(),
      name: this.resolveName(),
      email: this.resolveEmail(),
      coffees: this.resolveCoffees(),
      type: this.resolveType(),
      is_active: this.resolveIsActive(),
      message: this.resolveMessage(),
      support_date: this.resolveSupportDate(),
    };
  }

  private resolveExternalId(): string | null {
    const id = String(
      this.data['transaction_id'] ||
      this.data['psp_id'] ||
      this.data['subscription_id'] ||
      this.data['id'] ||
      ''
    );
    return id || null;
  }

  private resolveName(): string {
    const raw = String(
      this.data['supporter_name'] ||
      this.data['payer_name'] ||
      this.data['name'] ||
      'Anonymous'
    );
    return sanitizeName(raw, this.isPrivate);
  }

  private resolveEmail(): string | null {
    const email = this.data['supporter_email'] || this.data['payer_email'] || this.data['email'];
    return email ? String(email) : null;
  }

  private resolveCoffees(): number {
    const count = Number(
      this.data['coffee_count'] ||
      this.data['number_of_coffees'] ||
      this.data['coffees'] ||
      this.data['quantity'] ||
      0
    );
    const amount = Number(
      this.data['amount'] ||
      this.data['total_amount_charged'] ||
      this.data['coffee_price'] ||
      0
    );
    if (amount > 0) {
      return Math.max(count, Math.max(1, Math.round(amount / 2.25)));
    }
    return Math.max(1, count);
  }

  private resolveType(): SupporterType {
    return this.isSubscription() ? SupporterType.Membership : SupporterType.Donation;
  }

  private resolveIsActive(): boolean {
    const isInactiveEvent =
      this.eventType.endsWith('.refunded') ||
      this.eventType.endsWith('.cancelled') ||
      this.eventType.endsWith('.paused');
    const isInactiveStatus =
      this.data['status'] === 'refunded' ||
      this.data['status'] === 'canceled' ||
      this.data['status'] === 'paused';
    const isInactiveFlag =
      this.data['refunded'] === 'true' ||
      this.data['canceled'] === 'true' ||
      this.data['paused'] === 'true';

    return !isInactiveEvent && !isInactiveStatus && !isInactiveFlag;
  }

  private resolveMessage(): string | null {
    const raw = this.data['support_note'] || this.data['message'] || null;
    return sanitizeMessage(raw ? String(raw) : null, this.isPrivate) || null;
  }

  private resolveSupportDate(): Date {
    const raw =
      this.data['support_created_on'] ||
      this.data['created_at'] ||
      this.data['started_at'] ||
      this.data['created'];
    return this.parseDate(raw);
  }

  private parseDate(raw: unknown): Date {
    if (typeof raw === 'number') {
      return raw < 1e11 ? new Date(raw * 1000) : new Date(raw);
    }
    if (typeof raw === 'string' && /^\d+$/.test(raw)) {
      const num = parseInt(raw, 10);
      return num < 1e11 ? new Date(num * 1000) : new Date(num);
    }
    if (typeof raw === 'string') {
      return new Date(raw);
    }
    return new Date();
  }

  private isSubscription(): boolean {
    return (
      this.eventType.startsWith('membership.') ||
      this.eventType.startsWith('recurring_donation.') ||
      this.eventType === 'subscription' ||
      Boolean(
        this.data['subscription_id'] ||
        this.data['membership_level_id'] ||
        this.data['psp_id']
      )
    );
  }
}
