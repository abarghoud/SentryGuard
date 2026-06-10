import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MobileShell } from './MobileShell';
import { ThemeProvider, useTheme } from './theme';
import { initializeRuntimeConfig, tokenStore } from './api';
import { openTeslaApp } from './tesla-app-link';
import { pushNotificationService } from '../features/notifications/di';
import './i18n';

export function App(): JSX.Element {
  const queryClient = useMemo(() => new QueryClient(), []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <SafeAreaProvider>
          <ThemeProvider>
            <ThemedAppContent />
          </ThemeProvider>
        </SafeAreaProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function ThemedAppContent(): JSX.Element {
  const { isDark } = useTheme();
  const [isApiReady, setIsApiReady] = useState(false);

  useEffect(() => {
    void pushNotificationService.configure();
    void initializeRuntimeConfig().finally(() => setIsApiReady(true));
  }, []);

  if (!isApiReady) {
    return (
      <View style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <Text>SentryGuard</Text>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <SessionQueryBoundary />
    </>
  );
}

function SessionQueryBoundary(): JSX.Element {
  const queryClient = useQueryClient();

  useEffect(() => tokenStore.subscribe((token) => {
    if (!token) {
      queryClient.clear();
    }
  }), [queryClient]);

  useEffect(() => {
    const onAlertNotification = (): void => {
      void queryClient.invalidateQueries({ queryKey: ['alerts'] });
    };
    const onAlertNotificationResponse = (response: Notifications.NotificationResponse): void => {
      void handleAlertNotificationResponse(response, queryClient);
    };
    const receivedSubscription = Notifications.addNotificationReceivedListener(onAlertNotification);
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(onAlertNotificationResponse);
    const lastResponse = Notifications.getLastNotificationResponse();

    if (lastResponse) {
      void handleAlertNotificationResponse(lastResponse, queryClient);
    }

    return () => {
      receivedSubscription.remove();
      responseSubscription.remove();
    };
  }, [queryClient]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        void pushNotificationService.configure();
        void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      }
    });

    return () => subscription.remove();
  }, [queryClient]);

  return <MobileShell />;
}

async function handleAlertNotificationResponse(
  response: Notifications.NotificationResponse,
  queryClient: QueryClient
): Promise<void> {
  void queryClient.invalidateQueries({ queryKey: ['alerts'] });

  if (response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
    return;
  }

  const teslaRedirectUrl = resolveTeslaRedirectUrl(response.notification.request.content.data);
  if (!teslaRedirectUrl) {
    return;
  }

  Notifications.clearLastNotificationResponse();
  await openTeslaApp(teslaRedirectUrl);
}

function resolveTeslaRedirectUrl(data: Record<string, unknown>): string | null {
  return typeof data.teslaRedirectUrl === 'string' ? data.teslaRedirectUrl : null;
}
