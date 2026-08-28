import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supporter, SupporterType } from '../../entities/supporter.entity';
import { BmcWebhookPayload, verifyWebhookSignature } from './bmc-webhook-parser.util';
import { aggregateSupporters } from './supporter-aggregator.util';

export interface PublicSupporterDto {
  id: string;
  name: string;
  coffees: number;
  isSubscriber?: boolean;
  monthlyCoffees?: number;
  supportDate: string;
  message?: string;
}

export interface PublicSubscriberDto {
  id: string;
  name: string;
  durationType: string;
  membershipDate: string;
  coffees: number;
}

export interface PublicSupportersResponse {
  subscribers: PublicSubscriberDto[];
  supporters: PublicSupporterDto[];
  totalCoffeesCount: number;
  hasActiveSupporters: boolean;
}

@Injectable()
export class SupportersService {
  private readonly logger = new Logger(SupportersService.name);

  constructor(
    @InjectRepository(Supporter)
    private readonly supporterRepository: Repository<Supporter>
  ) {}

  public async getPublicSupporters(): Promise<PublicSupportersResponse> {
    const activeItems = await this.supporterRepository.find({
      where: { is_active: true },
      order: { support_date: 'DESC' },
    });
    const totalCoffeesCount = activeItems.reduce((acc, item) => acc + item.coffees, 0);
    const unifiedSupporters = aggregateSupporters(activeItems);

    return {
      subscribers: [],
      supporters: unifiedSupporters,
      totalCoffeesCount,
      hasActiveSupporters: unifiedSupporters.length > 0,
    };
  }

  public async handleWebhook(
    payload: Record<string, unknown>,
    rawBody?: string,
    signature?: string
  ): Promise<Supporter> {
    if (!rawBody || !signature || !verifyWebhookSignature(rawBody, signature)) {
      this.logger.warn('Received invalid or missing Buy Me a Coffee webhook signature');
      throw new UnauthorizedException('Invalid webhook signature');
    }

    const supporterData = new BmcWebhookPayload(payload).toSupporter();
    return this.upsertSupporter(supporterData);
  }


  private async upsertSupporter(data: Partial<Supporter>): Promise<Supporter> {
    const existing = await this.findExistingSupporter(data);
    if (existing) {
      Object.assign(existing, data);
      return this.supporterRepository.save(existing);
    }

    const created = this.supporterRepository.create(data);
    return this.supporterRepository.save(created);
  }

  private async findExistingSupporter(data: Partial<Supporter>): Promise<Supporter | null> {
    if (data.external_id) {
      const byExternalId = await this.supporterRepository.findOne({
        where: { external_id: data.external_id },
      });

      if (byExternalId) {
        return byExternalId;
      }
    }

    if (data.email && data.type === SupporterType.Membership) {
      return this.supporterRepository.findOne({
        where: { email: data.email, type: SupporterType.Membership },
        order: { support_date: 'DESC' },
      });
    }

    return null;
  }
}
