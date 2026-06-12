import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export enum AppTab {
  Dashboard = 'dashboard',
  Alerts = 'alerts',
  Settings = 'settings',
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
};

export type MainStackParamList = {
  DeleteAccount: undefined;
  Tabs: undefined;
  TelegramSettings: undefined;
  VehicleDetail: { vehicleId: string };
};

export type AppTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Settings: undefined;
};

export type VehicleDetailScreenProps = NativeStackScreenProps<MainStackParamList, 'VehicleDetail'>;
