import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MobileShell } from './MobileShell';
import { ThemeMode, ThemeProvider, useTheme } from './theme';
import { initializeApiUrl } from '../services/api/api-client';
import { initializeVirtualKeyPairingUrl } from '../services/api/virtual-key';
import { configurePushNotifications } from '../services/notifications/push-notifications';
import { subscribeAccessToken } from '../services/api/token-state';
import './i18n';

export function App(): JSX.Element {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <ThemeProvider>
          <ThemedAppContent />
        </ThemeProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

function ThemedAppContent(): JSX.Element {
  const { mode } = useTheme();
  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    configurePushNotifications();
    Promise.all([initializeApiUrl(), initializeVirtualKeyPairingUrl()]).finally(() => setIsApiReady(true));
  }, []);

  if (!isApiReady) {
    return (
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <StatusBar style={mode === ThemeMode.Dark ? 'light' : 'dark'} />
        <Text>SentryGuard</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={mode === ThemeMode.Dark ? 'light' : 'dark'} />
      <SessionQueryBoundary />
    </>
  );
}

function SessionQueryBoundary(): JSX.Element {
  const queryClient = useQueryClient();

  useEffect(() => subscribeAccessToken((token) => {
    if (!token) {
      queryClient.clear();
    }
  }), [queryClient]);

  useEffect(() => {
    const onAlertNotification = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    };
    const receivedSubscription = Notifications.addNotificationReceivedListener(onAlertNotification);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onAlertNotification);

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [queryClient]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      }
    });

    return () => subscription.remove();
  }, [queryClient]);

  return <MobileShell />;
}
