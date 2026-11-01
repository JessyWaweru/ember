import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';

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
        <Stack.Screen
          name="habit/[id]"
          options={{ headerShown: true, title: '', headerTransparent: true, headerTintColor: C.text }}
        />
        <Stack.Screen
          name="exercise/[id]"
          options={{ headerShown: true, title: '', headerTransparent: true, headerTintColor: C.text }}
        />
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
