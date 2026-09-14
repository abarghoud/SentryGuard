import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import type { JSX } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { AppState, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { MobileShell } from './MobileShell';
import { ThemeProvider, useTheme } from './theme';
import { initializeRuntimeConfig, tokenStore } from './api';
import { appLogger, installGlobalErrorLogging } from './logging';
import { useAlertNotifications } from './hooks/use-alert-notifications';
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
    void appLogger.initialize();
    installGlobalErrorLogging(appLogger);
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

  useAlertNotifications();

  useEffect(() => tokenStore.subscribe((token) => {
    appLogger.info('auth', token ? 'Session token stored' : 'Session cleared');
    if (!token) {
      queryClient.clear();
    }
  }), [queryClient]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        appLogger.info('app', 'App became active');
        void pushNotificationService.configure();
        void queryClient.invalidateQueries({ queryKey: ['alerts'] });
      }
    });

    return () => subscription.remove();
  }, [queryClient]);

  return <MobileShell />;
}

