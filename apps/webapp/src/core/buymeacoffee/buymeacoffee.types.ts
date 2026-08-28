export interface SupporterItem {
  id: string;
  name: string;
  coffees: number;
  isSubscriber?: boolean;
  monthlyCoffees?: number;
  supportDate: string;
  message?: string;
}

export interface SubscriberItem {
  id: string;
  name: string;
  durationType: 'month' | 'year';
  membershipDate: string;
  coffees: number;
}

export interface SupportersData {
  subscribers: SubscriberItem[];
  supporters: SupporterItem[];
  totalCoffeesCount: number;
  hasActiveSupporters: boolean;
}
