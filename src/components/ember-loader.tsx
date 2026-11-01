import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';

import { C } from '@/constants/theme';

import { Txt } from './ui';

export const LOADING_LINES = ['Lighting the ember…', 'Feeding it oxygen…', 'Fanning the flames…', 'Stoking the coals…'];

/** A flickering ember with cycling status lines. Matches the HTML pre-loader in public/index.html. */
export function EmberLoader() {
  const [flicker] = useState(() => new Animated.Value(0));
  const [breathe] = useState(() => new Animated.Value(0));
  const [fade] = useState(() => new Animated.Value(1));
  const [line, setLine] = useState(0);

  useEffect(() => {
    const loop = (v: Animated.Value, ms: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(v, { toValue: 1, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: ms, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      );
    const a = loop(flicker, 420);
    const b = loop(breathe, 1200);
    a.start();
    b.start();
    const timer = setInterval(() => {
      Animated.timing(fade, { toValue: 0, duration: 180, useNativeDriver: true }).start(() => {
        setLine((l) => (l + 1) % LOADING_LINES.length);
        Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
      });
    }, 1400);
    return () => {
      a.stop();
      b.stop();
      clearInterval(timer);
    };
  }, [flicker, breathe, fade]);

  return (
    <View style={{ flex: 1, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', gap: 36, paddingBottom: '12%' }}>
      <Animated.View
        style={{
          position: 'absolute', width: 340, height: 340, borderRadius: 170, backgroundColor: C.accent, marginTop: '-12%',
          opacity: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.07, 0.14] }),
          transform: [{ scale: breathe.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1.08] }) }],
        }}
      />
      <Animated.View
        style={{
          width: 64, height: 64, borderRadius: 32, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
          shadowColor: C.accent, shadowOpacity: 0.8, shadowRadius: 26, shadowOffset: { width: 0, height: 0 },
          transform: [{ scale: flicker.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.06] }) }],
        }}>
        <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFC15E', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF6D5' }} />
        </View>
      </Animated.View>
      <Animated.View style={{ opacity: fade }}>
        <Txt color={C.textDim} style={{ fontWeight: '600', fontSize: 15 }}>{LOADING_LINES[line]}</Txt>
      </Animated.View>
    </View>
  );
}
