import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export enum AppTab {
  Dashboard = 'dashboard',
  Alerts = 'alerts',
  Settings = 'settings',
}

export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  VehicleDetail: { vehicleId: string };
};

export type VehicleDetailScreenProps = NativeStackScreenProps<RootStackParamList, 'VehicleDetail'>;
