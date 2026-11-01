import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { DialogHost } from '@/components/dialog';
import { C } from '@/constants/theme';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 2 } },
});

const theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: C.bg, card: C.bg, primary: C.accent, text: C.text, border: C.border },
};

const sheet = {
  presentation: 'formSheet' as const,
  sheetGrabberVisible: true,
  sheetAllowedDetents: [0.92],
  headerShown: false,
};

// On web the stack header ignores the iPhone notch, so detail pages draw their own back button (see Screen's `back`).
const detailHeader = {
  headerShown: Platform.OS !== 'web',
  title: '',
  headerTransparent: true,
  headerTintColor: C.text,
};

function RootStack() {
  const { session, loading } = useAuth();
  const userId = session?.user.id;

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  // Drop cached data on sign-out / account switch, so nothing leaks between accounts.
  // Only when a previous user existed: clearing on first sign-in would orphan the initial queries.
  const prevUserId = useRef(userId);
  useEffect(() => {
    if (prevUserId.current && prevUserId.current !== userId) queryClient.clear();
    prevUserId.current = userId;
  }, [userId]);

  if (loading) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: C.bg } }}>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="sign-in" />
      </Stack.Protected>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="add-meal" options={sheet} />
        <Stack.Screen name="log-workout" options={sheet} />
        <Stack.Screen name="habit-edit" options={sheet} />
        <Stack.Screen name="weight" options={{ ...sheet, sheetAllowedDetents: [0.5] }} />
        <Stack.Screen name="goals" options={sheet} />
        <Stack.Screen name="habit-pause" options={sheet} />
        <Stack.Screen name="habit/[id]" options={detailHeader} />
        <Stack.Screen name="habits-stats" options={detailHeader} />
        <Stack.Screen name="habits-manage" options={detailHeader} />
        <Stack.Screen name="exercise/[id]" options={detailHeader} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider value={theme}>
          <StatusBar style="light" />
          <RootStack />
          <DialogHost />
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
