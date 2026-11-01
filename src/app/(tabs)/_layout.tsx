import { Redirect, Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

import { Loading } from '@/components/ui';
import { C } from '@/constants/theme';
import { useProfile } from '@/lib/data';
import { sound } from '@/lib/sound';
import { useWidgetSync } from '@/widgets/sync';

const TABS = [
  { name: 'index', label: 'Today', sf: 'flame.fill', md: 'local_fire_department' },
  { name: 'history', label: 'History', sf: 'calendar', md: 'calendar_month' },
  { name: 'train', label: 'Train', sf: 'figure.run', md: 'directions_run' },
  { name: 'habits', label: 'Habits', sf: 'checkmark.circle.fill', md: 'task_alt' },
  { name: 'me', label: 'Me', sf: 'person.crop.circle.fill', md: 'account_circle' },
] as const;

type SymbolName = ComponentProps<typeof SymbolView>['name'];

// On web, native tabs render as a top bar; a JS bottom bar feels right in an installed iPhone web app.
function WebTabs() {
  return (
    <Tabs
      screenListeners={{ tabPress: () => sound.tick() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.accent,
        tabBarInactiveTintColor: C.textDim,
        tabBarStyle: { backgroundColor: C.bg, borderTopColor: C.border },
        sceneStyle: { backgroundColor: C.bg },
      }}>
      {TABS.map((t) => (
        <Tabs.Screen
          key={t.name}
          name={t.name}
          options={{
            title: t.label,
            tabBarIcon: ({ color }) => <SymbolView name={{ web: t.md } as SymbolName} tintColor={color} size={24} />,
          }}
        />
      ))}
    </Tabs>
  );
}

export default function TabsLayout() {
  const profile = useProfile();
  useWidgetSync();

  if (profile.isPending) return <Loading />;
  if (profile.data && !profile.data.onboarded) return <Redirect href="/onboarding" />;
  if (Platform.OS === 'web') return <WebTabs />;

  return (
    <NativeTabs backgroundColor={C.bg} indicatorColor={C.accentSoft} tintColor={C.accent} labelStyle={{ selected: { color: C.text } }}>
      {TABS.map((t) => (
        <NativeTabs.Trigger key={t.name} name={t.name}>
          <NativeTabs.Trigger.Label>{t.label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={t.sf} md={t.md} />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
