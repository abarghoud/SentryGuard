import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Dimensions, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppTab, type RootStackParamList } from '../navigation';
import { useTheme } from '../theme';
import { AlertsScreen } from '../../screens/AlertsScreen';
import { DashboardScreen } from '../../screens/DashboardScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { VehicleDetailScreen } from '../../screens/VehicleDetailScreen';
import { getAuthProfileUseCase } from '../../features/auth/di';

const tabs: AppTab[] = [AppTab.Dashboard, AppTab.Alerts, AppTab.Settings];
const { width: screenWidth } = Dimensions.get('window');

const staticStyles = StyleSheet.create({
  page: {
    flex: 1,
    width: screenWidth,
  },
  pager: {
    flex: 1,
  },
  tabButton: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    paddingVertical: 12,
  },
});

export function MainScreen({
  onLogout,
}: NativeStackScreenProps<RootStackParamList, 'Main'> & { onLogout(): Promise<void> }): JSX.Element {
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.Dashboard);
  const [programmaticScroll, setProgrammaticScroll] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const pagerRef = useRef<ScrollView>(null);
  const { colors, mode } = useTheme();
  const { t } = useTranslation();
  const profileQuery = useQuery({
    queryFn: () => getAuthProfileUseCase.execute(),
    queryKey: ['auth-profile'],
  });
  const isBetaTester = profileQuery.data?.profile.isBetaTester === true;

  const scrollToTab = useCallback((tab: AppTab) => {
    const index = tabs.indexOf(tab);
    setProgrammaticScroll(true);
    setActiveTab(tab);
    pagerRef.current?.scrollTo({ x: index * screenWidth, animated: true });
  }, []);

  const handleMomentumEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      if (programmaticScroll) {
        setProgrammaticScroll(false);
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;
      const newIndex = Math.round(offsetX / screenWidth);

      if (newIndex >= 0 && newIndex < tabs.length) {
        setActiveTab(tabs[newIndex]);
      }
    },
    [programmaticScroll]
  );

  useEffect(() => {
    const onBackPress = (): boolean => {
      if (selectedVehicleId) {
        setSelectedVehicleId(null);
        return true;
      }

      if (activeTab !== AppTab.Dashboard) {
        scrollToTab(AppTab.Dashboard);
        return true;
      }

      return false;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [activeTab, scrollToTab, selectedVehicleId]);

  return (
    <View style={{ backgroundColor: colors.background, flex: 1 }}>
      <SafeAreaView style={{ backgroundColor: colors.background, flex: 1 }} edges={['top']}>
        <ScrollView
          horizontal
          ref={pagerRef}
          onMomentumScrollEnd={handleMomentumEnd}
          pagingEnabled
          scrollEventThrottle={16}
          showsHorizontalScrollIndicator={false}
          style={staticStyles.pager}
        >
          <View style={staticStyles.page}>
            <DashboardScreen isBetaTester={isBetaTester} onSelectVehicle={(vehicle) => setSelectedVehicleId(vehicle.vin)} />
          </View>
          <View style={staticStyles.page}>
            <AlertsScreen isActive={activeTab === AppTab.Alerts} />
          </View>
          <View style={staticStyles.page}>
            <SettingsScreen onLogout={onLogout} />
          </View>
        </ScrollView>
        <View
          key={`tabbar-${mode}`}
          style={{ backgroundColor: colors.surface, borderTopColor: colors.border, borderTopWidth: 1, flexDirection: 'row', gap: 8, paddingBottom: 8, paddingHorizontal: 12, paddingTop: 10 }}
        >
          {tabs.map((tab) => (
            <Pressable
              key={tab}
              accessibilityRole="button"
              accessibilityState={{ selected: activeTab === tab }}
              android_ripple={{ color: colors.surface, borderless: true }}
              onPress={() => scrollToTab(tab)}
              style={[staticStyles.tabButton, activeTab === tab ? { backgroundColor: colors.accent } : {}]}
            >
              <Text style={{ color: activeTab === tab ? colors.accentText : colors.muted, fontSize: 13, fontWeight: '700' }}>{t(resolveTabLabelKey(tab))}</Text>
            </Pressable>
          ))}
        </View>
      </SafeAreaView>
      {selectedVehicleId ? (
        <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: colors.background }}>
          <VehicleDetailScreen
            navigation={{ goBack: () => setSelectedVehicleId(null) }}
            route={{ params: { vehicleId: selectedVehicleId } }}
          />
        </View>
      ) : null}
    </View>
  );
}

function resolveTabLabelKey(tab: AppTab): string {
  if (tab === AppTab.Alerts) {
    return 'tabs.alerts';
  }

  if (tab === AppTab.Settings) {
    return 'tabs.settings';
  }

  return 'tabs.dashboard';
}
