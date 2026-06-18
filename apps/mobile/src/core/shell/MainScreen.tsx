import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import type { JSX } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { TextVariant, textStyle } from '../design/typography';
import { AppTabParamList, MainStackParamList } from '../navigation';
import { useTheme } from '../theme';
import { GlassBackground } from '../ui';
import { Icon } from '../ui/Icon';
import { getAlertsUseCase } from '../../features/alerts/di';
import { countUnreadAlerts } from '../../screens/alerts/alerts.helpers';
import { useAlertsSeen } from '../../screens/alerts/use-alerts-seen';
import { AlertsScreen } from '../../screens/AlertsScreen';
import { DashboardScreen } from '../../screens/DashboardScreen';
import { DeleteAccountScreen } from '../../screens/DeleteAccountScreen';
import { OnboardingScreen } from '../../screens/OnboardingScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { TelegramSettingsScreen } from '../../screens/TelegramSettingsScreen';
import { VehicleDetailScreen } from '../../screens/VehicleDetailScreen';

const Tabs = createBottomTabNavigator<AppTabParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();

export function MainScreen({ onLogout }: { onLogout(): Promise<void> }): JSX.Element {
  const { colors } = useTheme();
  const { t } = useTranslation();

  return (
    <MainStack.Navigator
      screenOptions={{
        contentStyle: { backgroundColor: colors.systemGroupedBackground },
        headerTintColor: colors.accent,
        headerTitleStyle: { color: colors.label, fontSize: textStyle(TextVariant.Headline).fontSize, fontWeight: '600' },
        headerStyle: { backgroundColor: colors.systemGroupedBackground },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    >
      <MainStack.Screen name="Tabs" options={{ headerShown: false }}>
        {() => <AppTabs onLogout={onLogout} />}
      </MainStack.Screen>
      <MainStack.Screen name="Onboarding" options={{ headerShown: true, presentation: 'card', title: t('onboarding.resumeTitle') }}>
        {({ navigation }) => <OnboardingScreen onComplete={() => navigation.goBack()} />}
      </MainStack.Screen>
      <MainStack.Screen name="VehicleDetail" component={VehicleDetailScreen} options={{ headerShown: true, presentation: 'card' }} />
      <MainStack.Screen name="TelegramSettings" component={TelegramSettingsScreen} options={{ headerShown: true, presentation: 'card' }} />
      <MainStack.Screen name="DeleteAccount" options={{ headerShown: true, presentation: 'card' }}>
        {() => <DeleteAccountScreen onLogout={onLogout} />}
      </MainStack.Screen>
    </MainStack.Navigator>
  );
}

function AppTabs({ onLogout }: { onLogout(): Promise<void> }): JSX.Element {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const { lastSeenAt } = useAlertsSeen();
  const alertsQuery = useQuery({
    queryFn: () => getAlertsUseCase.execute(),
    queryKey: ['alerts'],
    refetchInterval: 30000,
  });
  const unreadAlertCount = countUnreadAlerts(alertsQuery.data ?? [], lastSeenAt);

  return (
    <Tabs.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.label,
        tabBarInactiveTintColor: isDark ? colors.secondaryLabel : colors.tertiaryLabel,
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
        {() => <DashboardScreen />}
      </Tabs.Screen>
      <Tabs.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{
          title: t('tabs.alerts'),
          tabBarBadge: unreadAlertCount > 0 ? unreadAlertCount : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.criticalFill, color: colors.onCritical },
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
