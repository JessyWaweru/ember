import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import type { ComponentProps, ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { BottomTabInset, C, Fonts, Radius, Space } from '@/constants/theme';

export const tap = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
};

// ───────────── text ─────────────

type TxtVariant = 'hero' | 'title' | 'heading' | 'body' | 'label' | 'caption';

export function Txt({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: TxtVariant; color?: string }) {
  return <Text {...rest} style={[styles[variant], color ? { color } : null, style]} />;
}

// ───────────── layout ─────────────

export function Screen({
  children,
  scroll = true,
  tabs = false,
  style,
}: {
  children: ReactNode;
  scroll?: boolean;
  /** extra bottom padding so content clears the tab bar */
  tabs?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const pad = { paddingHorizontal: Space.lg, paddingBottom: (tabs ? BottomTabInset : 0) + Space.xxl };
  return (
    // Sheets sit below the status bar natively, but on web they render full-screen and need the top inset too.
    <SafeAreaView style={styles.screen} edges={tabs ? ['top'] : Platform.OS === 'web' ? ['top', 'bottom'] : ['bottom']}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[pad, { gap: Space.lg, paddingTop: Space.md }, style]}
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: Space.md }, pad, style]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }, style]}>
        {children}
      </Pressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

export const Row = ({ children, style, gap = Space.sm }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

/** Title row for sheet screens, with a close button (installed web apps have no back button). */
export function SheetHeader({ title }: { title: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: Space.md }}>
      <Txt variant="title" style={{ flex: 1 }}>{title}</Txt>
      <IconButton icon="close" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
    </Row>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <Row style={{ justifyContent: 'space-between', marginTop: Space.sm }}>
      <Txt variant="heading">{title}</Txt>
      {action}
    </Row>
  );
}

export function Empty({ icon, title, body }: { icon: string; title: string; body?: string }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: Space.xxl, gap: Space.sm }}>
      <Txt style={{ fontSize: 36 }}>{icon}</Txt>
      <Txt variant="heading">{title}</Txt>
      {body ? <Txt color={C.textDim} style={{ textAlign: 'center' }}>{body}</Txt> : null}
    </Card>
  );
}

export const Loading = () => (
  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
    <ActivityIndicator color={C.accent} />
  </View>
);

// ───────────── icons ─────────────

const ICONS = {
  plus: { ios: 'plus', android: 'add', web: 'add' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  chevronLeft: { ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' },
  chevronRight: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  search: { ios: 'magnifyingglass', android: 'search', web: 'search' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  minus: { ios: 'minus', android: 'remove', web: 'remove' },
} as const;

export function Icon({ name, size = 20, color = C.text }: { name: keyof typeof ICONS; size?: number; color?: string }) {
  return (
    <SymbolView
      name={ICONS[name] as ComponentProps<typeof SymbolView>['name']}
      size={size}
      tintColor={color}
      weight="semibold"
      fallback={<Txt style={{ fontSize: size, color, lineHeight: size + 2 }}>{FALLBACK[name]}</Txt>}
    />
  );
}
const FALLBACK: Record<keyof typeof ICONS, string> = {
  plus: '+', check: '✓', chevronLeft: '‹', chevronRight: '›', flame: '🔥', trash: '🗑', search: '⌕', close: '×', minus: '−',
};

// ───────────── controls ─────────────

export function Button({
  title,
  onPress,
  variant = 'primary',
  loading,
  disabled,
  color = C.accent,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const bg = variant === 'primary' ? color : variant === 'secondary' ? C.cardHigh : 'transparent';
  const fg = variant === 'primary' ? '#fff' : variant === 'danger' ? C.danger : C.text;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: bg, opacity: disabled ? 0.4 : pressed ? 0.8 : 1 },
        style,
      ]}>
      {loading ? <ActivityIndicator color={fg} /> : <Txt variant="label" color={fg}>{title}</Txt>}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, color = C.text, bg = C.cardHigh, size = 36 }: {
  icon: keyof typeof ICONS; onPress: () => void; color?: string; bg?: string; size?: number;
}) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      hitSlop={8}
      style={({ pressed }) => ({
        width: size, height: size, borderRadius: size / 2, backgroundColor: bg,
        alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1,
      })}>
      <Icon name={icon} size={size * 0.45} color={color} />
    </Pressable>
  );
}

export function Field({ label, suffix, style, ...rest }: TextInputProps & { label?: string; suffix?: string }) {
  return (
    <View style={[{ gap: Space.xs }, style as StyleProp<ViewStyle>]}>
      {label ? <Txt variant="caption" color={C.textDim}>{label}</Txt> : null}
      <View style={styles.field}>
        <TextInput placeholderTextColor={C.textFaint} style={styles.input} {...rest} />
        {suffix ? <Txt color={C.textDim}>{suffix}</Txt> : null}
      </View>
    </View>
  );
}

export function Segmented<T extends string>({ options, value, onChange, color = C.accent }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void; color?: string;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => {
              tap();
              onChange(o.value);
            }}
            style={[styles.segment, active && { backgroundColor: color }]}>
            <Txt variant="caption" color={active ? '#fff' : C.textDim} style={{ fontWeight: '600' }}>{o.label}</Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Chip({ label, active, onPress, color = C.accent }: { label: string; active?: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.chip, active && { backgroundColor: color, borderColor: color }]}>
      <Txt variant="caption" color={active ? '#fff' : C.text} style={{ fontWeight: '600' }}>{label}</Txt>
    </Pressable>
  );
}

// ───────────── progress ─────────────

export function Ring({
  size,
  stroke,
  progress,
  color,
  track = C.cardHigh,
  children,
}: {
  size: number;
  stroke: number;
  progress: number;
  color: string;
  track?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          strokeDashoffset={circ * (1 - p)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

export function Bar({ progress, color, height = 8 }: { progress: number; color: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height, backgroundColor: C.cardHigh, overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(1, progress)) * 100}%`, height, borderRadius: height, backgroundColor: color }} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  hero: { fontSize: 40, fontWeight: '800', color: C.text, fontFamily: Fonts?.rounded, fontVariant: ['tabular-nums'] },
  title: { fontSize: 28, fontWeight: '800', color: C.text },
  heading: { fontSize: 18, fontWeight: '700', color: C.text },
  body: { fontSize: 15, color: C.text },
  label: { fontSize: 16, fontWeight: '700', color: C.text },
  caption: { fontSize: 13, color: C.text },
  card: { backgroundColor: C.card, borderRadius: Radius.md, padding: Space.lg, borderWidth: StyleSheet.hairlineWidth, borderColor: C.border },
  button: { height: 52, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: Space.lg },
  field: {
    flexDirection: 'row', alignItems: 'center', gap: Space.sm, backgroundColor: C.cardHigh,
    borderRadius: Radius.sm, paddingHorizontal: Space.md, minHeight: 48,
  },
  // minWidth: 0 lets web inputs shrink in narrow rows instead of pushing the suffix out
  input: { flex: 1, minWidth: 0, color: C.text, fontSize: 16, paddingVertical: Space.md, outlineWidth: 0 },
  segmented: { flexDirection: 'row', backgroundColor: C.cardHigh, borderRadius: Radius.sm, padding: 3 },
  segment: { flex: 1, alignItems: 'center', paddingVertical: Space.sm, borderRadius: Radius.sm - 3 },
  chip: {
    paddingHorizontal: Space.md, paddingVertical: Space.sm, borderRadius: Radius.pill,
    borderWidth: 1, borderColor: C.border, backgroundColor: C.card,
  },
});
