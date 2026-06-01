import { useQuery } from '@tanstack/react-query';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { AppTabParamList, MainStackParamList } from '../navigation';
import { useTheme } from '../theme';
import { GlassBackground } from '../ui';
import { Icon } from '../ui/Icon';
import { AlertsScreen } from '../../screens/AlertsScreen';
import { DashboardScreen } from '../../screens/DashboardScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { VehicleDetailScreen } from '../../screens/VehicleDetailScreen';
import { getAuthProfileUseCase } from '../../features/auth/di';

const Tabs = createBottomTabNavigator<AppTabParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

export function MainScreen({ onLogout }: { onLogout(): Promise<void> }): JSX.Element {
  const { colors } = useTheme();

  return (
    <MainStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.systemGroupedBackground },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.label },
        headerStyle: { backgroundColor: colors.systemGroupedBackground },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <MainStack.Screen name="Tabs" options={{ headerShown: false }}>
        {() => <AppTabs onLogout={onLogout} />}
      </MainStack.Screen>
      <MainStack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ headerShown: true, presentation: 'card' }} />
    </MainStack.Navigator>
  );
}

function AppTabs({ onLogout }: { onLogout(): Promise<void> }): JSX.Element {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const profileQuery = useQuery({
    queryFn: () => getAuthProfileUseCase.execute(),
    queryKey: ['auth-profile'],
  });
  const isBetaTester = profileQuery.data?.profile.isBetaTester === true;

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.systemBlue,
        tabBarInactiveTintColor: colors.secondaryLabel,
        tabBarStyle: Platform.OS === 'ios' ? { position: 'absolute', borderTopWidth: 0 } : { borderTopColor: colors.separator },
        tabBarBackground: Platform.OS === 'ios' ? () => <GlassBackground /> : undefined,
      }}
    >
      <Tabs.Screen
        name="Dashboard"
        options={{
          title: t('tabs.dashboard'),
          tabBarIcon: ({ color, size }) => <Icon name="car.fill" color={color} size={size} />,
        }}
      >
        {() => <DashboardScreen isBetaTester={isBetaTester} />}
      </Tabs.Screen>
      <Tabs.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: t('tabs.alerts'),
          tabBarIcon: ({ color, size }) => <Icon name="bell.fill" color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="Settings"
        options={{
          title: t('tabs.settings'),
          tabBarIcon: ({ color, size }) => <Icon name="gearshape.fill" color={color} size={size} />,
        }}
      >
        {() => <SettingsScreen onLogout={onLogout} />}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}
