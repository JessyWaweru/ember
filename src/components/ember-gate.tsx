import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { C, Space } from '@/constants/theme';

import { Txt } from './ui';

// Native gate: same page as the web canvas version (ember-gate.web.tsx); the throw is a flare and a fiery flash.
export function EmberGate({ onDone }: { onDone: () => void }) {
  const [flicker] = useState(() => new Animated.Value(0));
  const [flare] = useState(() => new Animated.Value(0));
  const [gate] = useState(() => new Animated.Value(1));
  const thrown = useRef(false);

  useEffect(() => {
    const a = Animated.loop(
      Animated.sequence([
        Animated.timing(flicker, { toValue: 1, duration: 380, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(flicker, { toValue: 0, duration: 420, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    a.start();
    return () => a.stop();
  }, [flicker]);

  function throwIt() {
    if (thrown.current) return;
    thrown.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.timing(flare, { toValue: 1, duration: 450, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      Animated.timing(gate, { toValue: 0, duration: 650, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start(() => onDone());
  }

  const emberScale = Animated.add(
    flicker.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1.05] }),
    flare.interpolate({ inputRange: [0, 1], outputRange: [0, 14] })
  );

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: C.bg, opacity: gate, zIndex: 1000 }]}>
      <View style={{ flex: 1, alignItems: 'center', paddingHorizontal: Space.xl }}>
        <View style={{ height: '38%', justifyContent: 'flex-end' }}>
          <Animated.View
            style={{
              width: 64, height: 64, borderRadius: 32, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
              shadowColor: C.accent, shadowOpacity: 0.9, shadowRadius: 30, shadowOffset: { width: 0, height: 0 },
              marginBottom: -32, transform: [{ scale: emberScale }],
            }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFC15E', alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFF6D5' }} />
            </View>
          </Animated.View>
        </View>
        <Animated.View style={{ marginTop: '30%', alignItems: 'center', gap: Space.sm, opacity: flare.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <Txt color={C.accent} style={{ fontWeight: '800', letterSpacing: 6, fontSize: 13 }}>EMBER</Txt>
          <Txt variant="title" style={{ textAlign: 'center' }}>It’s itching to burn.</Txt>
          <Txt color={C.textDim}>Everything you track is fuel.</Txt>
        </Animated.View>
        <View style={{ flex: 1 }} />
        <Animated.View style={{ alignSelf: 'stretch', marginBottom: '22%', opacity: flare.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }}>
          <Pressable
            onPress={throwIt}
            style={({ pressed }) => ({
              backgroundColor: C.accent, borderRadius: 29, height: 58, alignItems: 'center', justifyContent: 'center',
              shadowColor: C.accent, shadowOpacity: 0.7, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, opacity: pressed ? 0.85 : 1,
            })}>
            <Txt style={{ fontWeight: '800', fontSize: 16 }} color={C.bg}>Throw the ember into the fire 🔥</Txt>
          </Pressable>
        </Animated.View>
      </View>
    </Animated.View>
  );
}
