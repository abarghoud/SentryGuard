import { Supporter, SupporterType } from '../../entities/supporter.entity';
import { sanitizeMessage, sanitizeName } from './supporter-sanitizer.util';
import { PublicSupporterDto } from './supporters.service';

const ANONYMOUS_NAMES = ['someone', 'anonymous', 'supporter', 'anonyme'];

export class SupporterAggregator {
  constructor(private readonly items: Supporter[]) {}

  public aggregate(): PublicSupporterDto[] {
    const groups = this.groupItems();

    return Array.from(groups.values())
      .map((group) => this.mergeGroup(group))
      .sort((a, b) => this.compareSupporters(a, b));
  }

  private groupItems(): Map<string, Supporter[]> {
    return this.items.reduce((groups, item) => {
      const key = this.resolveKey(item);
      const existing = groups.get(key) || [];
      groups.set(key, [...existing, item]);
      return groups;
    }, new Map<string, Supporter[]>());
  }

  private compareSupporters(a: PublicSupporterDto, b: PublicSupporterDto): number {
    const coffeeDiff = b.coffees - a.coffees;
    if (coffeeDiff !== 0) {
      return coffeeDiff;
    }

    const subDiff = (b.isSubscriber ? 1 : 0) - (a.isSubscriber ? 1 : 0);
    if (subDiff !== 0) {
      return subDiff;
    }

    return new Date(b.supportDate).getTime() - new Date(a.supportDate).getTime();
  }

  private mergeGroup(group: Supporter[]): PublicSupporterDto {
    const sorted = [...group].sort((a, b) => b.support_date.getTime() - a.support_date.getTime());
    const latest = sorted[0];
    const isSubscriber = group.some((s) => s.type === SupporterType.Membership);

    return {
      id: latest.id,
      name: this.findBestName(sorted),
      coffees: this.computeTotalCoffees(group, isSubscriber),
      isSubscriber,
      monthlyCoffees: this.computeMonthlyCoffees(group, isSubscriber),
      supportDate: latest.support_date.toISOString(),
      message: sanitizeMessage(sorted.find((s) => s.message?.trim())?.message),
    };
  }

  private computeTotalCoffees(group: Supporter[], isSubscriber: boolean): number {
    const donationSum = group
      .filter((s) => s.type === SupporterType.Donation)
      .reduce((acc, curr) => acc + curr.coffees, 0);

    if (donationSum > 0) {
      return donationSum;
    }

    return this.computeMonthlyCoffees(group, isSubscriber) || 1;
  }

  private computeMonthlyCoffees(group: Supporter[], isSubscriber: boolean): number | undefined {
    if (!isSubscriber) {
      return undefined;
    }

    return group
      .filter((s) => s.type === SupporterType.Membership)
      .reduce((acc, curr) => acc + curr.coffees, 0);
  }

  private resolveKey(item: Supporter): string {
    if (item.email?.trim()) {
      return `email:${item.email.trim().toLowerCase()}`;
    }

    const name = item.name.trim().toLowerCase();
    const isAnonymous = !name || ANONYMOUS_NAMES.includes(name);

    if (isAnonymous) {
      return `id:${item.id}`;
    }

    return `name:${name}`;
  }

  private findBestName(sorted: Supporter[]): string {
    const valid = sorted.find(
      (s) => s.name && !ANONYMOUS_NAMES.includes(s.name.trim().toLowerCase())
    );

    const chosen = valid || sorted[0];
    return sanitizeName(chosen.name);
  }
}

export function aggregateSupporters(items: Supporter[]): PublicSupporterDto[] {
  return new SupporterAggregator(items).aggregate();
}
