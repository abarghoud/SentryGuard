export interface Supporter {
  coffees: number;
  id: string;
  isSubscriber?: boolean;
  message?: string;
  monthlyCoffees?: number;
  name: string;
  supportDate: string;
}

export interface Subscriber {
  coffees: number;
  durationType: string;
  id: string;
  membershipDate: string;
  name: string;
}

export interface SupportersData {
  hasActiveSupporters: boolean;
  subscribers: Subscriber[];
  supporters: Supporter[];
  totalCoffeesCount: number;
}
