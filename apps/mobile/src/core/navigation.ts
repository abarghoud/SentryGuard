import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export enum AppTab {
  Dashboard = 'dashboard',
  Alerts = 'alerts',
  Supporters = 'supporters',
  Settings = 'settings',
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainStackParamList = {
  DeleteAccount: undefined;
  Onboarding: undefined;
  Tabs: undefined;
  TelegramSettings: undefined;
  VehicleDetail: { vehicleId: string; title?: string };
};

export type AppTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Supporters: undefined;
  Settings: undefined;
};

export type VehicleDetailScreenProps = NativeStackScreenProps<MainStackParamList, 'VehicleDetail'>;
