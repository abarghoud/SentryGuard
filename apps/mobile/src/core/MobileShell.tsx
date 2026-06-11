import { useQuery } from '@tanstack/react-query';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { type RootStackParamList } from './navigation';
import { useTheme } from './theme';
import { MainScreen } from './shell/MainScreen';
import { createNavigationTheme } from './shell/navigation-theme';
import { AuthScreen } from '../screens/AuthScreen';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { getOnboardingStatusUseCase } from '../features/onboarding/di';
import { getUserLanguageUseCase } from '../features/user/di';
import { useSession } from './session/use-session';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function MobileShell(): JSX.Element {
  const session = useSession();
  const { colors, isDark } = useTheme();
  const { i18n } = useTranslation();
  const onboardingQuery = useQuery({
    enabled: session.isReady && !!session.token,
    queryFn: () => getOnboardingStatusUseCase.execute(),
    queryKey: ['onboarding-status'],
  });
  const languageQuery = useQuery({
    enabled: session.isReady && !!session.token,
    queryFn: () => getUserLanguageUseCase.execute(),
    queryKey: ['user-language'],
  });

  const isOnboardingComplete = onboardingQuery.data?.isComplete === true;

  useEffect(() => {
    const language = languageQuery.data?.language;
    if (isOnboardingComplete && language && i18n.language !== language) {
      void i18n.changeLanguage(language);
    }
  }, [i18n, isOnboardingComplete, languageQuery.data?.language]);

  if (!session.isReady || (session.token && onboardingQuery.isLoading)) {
    return (
      <SafeAreaView style={{ alignItems: 'center', backgroundColor: colors.systemBackground, flex: 1, justifyContent: 'center' }}>
        <Text style={{ color: colors.label, fontSize: 22, fontWeight: '700' }}>SentryGuard</Text>
      </SafeAreaView>
    );
  }

  return (
    <NavigationContainer theme={createNavigationTheme(colors, isDark)}>
      <Stack.Navigator screenOptions={{ contentStyle: { backgroundColor: colors.systemBackground }, headerShown: false }}>
        {session.token ? (
          onboardingQuery.data?.isComplete ? (
            <Stack.Screen name="Main" options={{ animation: 'none' }}>
              {() => <MainScreen onLogout={session.clearToken} />}
            </Stack.Screen>
          ) : (
            <Stack.Screen name="Main" options={{ animation: 'none' }}>
              {() => <OnboardingScreen onComplete={() => void onboardingQuery.refetch()} />}
            </Stack.Screen>
          )
        ) : (
          <Stack.Screen name="Auth" options={{ animation: 'none' }}>
            {() => <AuthScreen onAuthenticated={session.setToken} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
