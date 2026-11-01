import { Platform } from 'react-native';

// Ember is dark-only: one palette keeps the app and the widgets visually consistent.
export const C = {
  bg: '#0B0B0D',
  card: '#16161A',
  cardHigh: '#1F1F25',
  border: '#2A2A31',
  text: '#F5F5F7',
  textDim: '#9A9AA3',
  textFaint: '#5E5E66',
  accent: '#FF6B2C', // ember orange — calories
  accentSoft: '#3A2015',
  protein: '#F25F5C',
  carbs: '#F2B33D',
  fat: '#4D9DE0',
  burn: '#22C55E', // exercise
  habit: '#A78BFA',
  danger: '#EF4444',
} as const;

export const Fonts = Platform.select({
  ios: { rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { rounded: 'normal', mono: 'monospace' },
  web: { rounded: "ui-rounded, 'SF Pro Rounded', system-ui, sans-serif", mono: 'ui-monospace, monospace' },
});

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 } as const;
export const Radius = { sm: 10, md: 16, lg: 24, pill: 999 } as const;

// Native tab bars float over content; the web tab bar takes its own space, so no inset there.
export const BottomTabInset = Platform.select({ ios: 50, android: 80, web: 0 }) ?? 0;
