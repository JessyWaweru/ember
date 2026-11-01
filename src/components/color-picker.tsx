import { useState } from 'react';
import { View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { C, Radius, Space } from '@/constants/theme';
import { hexToHsv, hsvToHex, isHex, type Hsv } from '@/lib/color';

import { Field, Row, Txt } from './ui';

const SQUARE_H = 170;
const HUE_H = 28;
const HUES = [0, 60, 120, 180, 240, 300, 360];
// Keeps a drag on the picker from scrolling the page in the browser.
const noScroll = { touchAction: 'none', cursor: 'pointer' } as unknown as ViewStyle;

/** Drag-to-pick colour: saturation/brightness square, hue bar, and a hex box. Calls onChange with "#rrggbb". */
export function ColorPicker({ value, onChange }: { value: string; onChange: (hex: string) => void }) {
  // Kept locally so hue survives at black/white, where the hex alone forgets it.
  const [hsv, setHsv] = useState<Hsv>(() => hexToHsv(value));
  const [hexText, setHexText] = useState(value);
  const [width, setWidth] = useState(0);

  const apply = (next: Hsv) => {
    setHsv(next);
    const hex = hsvToHex(next);
    setHexText(hex);
    onChange(hex);
  };
  const clamp = (n: number) => Math.max(0, Math.min(1, n));
  // Children ignore touches, so locationX/Y are always relative to the box being dragged.
  const drag = (handler: (x: number, y: number) => void) => ({
    onStartShouldSetResponder: () => true,
    onMoveShouldSetResponder: () => true,
    onResponderTerminationRequest: () => false,
    onResponderGrant: (e: GestureResponderEvent) => handler(e.nativeEvent.locationX, e.nativeEvent.locationY),
    onResponderMove: (e: GestureResponderEvent) => handler(e.nativeEvent.locationX, e.nativeEvent.locationY),
  });
  const pureHue = hsvToHex({ h: hsv.h, s: 1, v: 1 });

  return (
    <View style={{ gap: Space.md }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          <View
            style={[{ height: SQUARE_H }, noScroll]}
            {...drag((x, y) => apply({ ...hsv, s: clamp(x / width), v: clamp(1 - y / SQUARE_H) }))}>
            <View pointerEvents="none">
              <Svg width={width} height={SQUARE_H}>
                <Defs>
                  <LinearGradient id="sat" x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0" stopColor="#fff" stopOpacity="1" />
                    <Stop offset="1" stopColor="#fff" stopOpacity="0" />
                  </LinearGradient>
                  <LinearGradient id="val" x1="0" y1="0" x2="0" y2="1">
                    <Stop offset="0" stopColor="#000" stopOpacity="0" />
                    <Stop offset="1" stopColor="#000" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect width={width} height={SQUARE_H} rx={Radius.sm} fill={pureHue} />
                <Rect width={width} height={SQUARE_H} rx={Radius.sm} fill="url(#sat)" />
                <Rect width={width} height={SQUARE_H} rx={Radius.sm} fill="url(#val)" />
              </Svg>
            </View>
            <Thumb left={hsv.s * width} top={(1 - hsv.v) * SQUARE_H} color={hsvToHex(hsv)} />
          </View>

          <View style={[{ height: HUE_H }, noScroll]} {...drag((x) => apply({ ...hsv, h: clamp(x / width) * 359.9 }))}>
            <View pointerEvents="none">
              <Svg width={width} height={HUE_H}>
                <Defs>
                  <LinearGradient id="hue" x1="0" y1="0" x2="1" y2="0">
                    {HUES.map((h) => (
                      <Stop key={h} offset={String(h / 360)} stopColor={hsvToHex({ h: h % 360, s: 1, v: 1 })} />
                    ))}
                  </LinearGradient>
                </Defs>
                <Rect width={width} height={HUE_H} rx={HUE_H / 2} fill="url(#hue)" />
              </Svg>
            </View>
            <Thumb left={(hsv.h / 360) * width} top={HUE_H / 2} color={pureHue} />
          </View>
        </>
      ) : null}

      <Row gap={Space.md}>
        <View style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: hsvToHex(hsv), borderWidth: 1, borderColor: C.border }} />
        <Field
          style={{ flex: 1 }}
          value={hexText}
          autoCapitalize="none"
          autoCorrect={false}
          maxLength={7}
          placeholder="#ff6b2c"
          onChangeText={(t) => {
            setHexText(t);
            if (isHex(t)) apply(hexToHsv(t.startsWith('#') ? t : `#${t}`));
          }}
        />
      </Row>
      <Txt variant="caption" color={C.textFaint}>Drag the square for shade, the bar for hue, or type a hex code.</Txt>
    </View>
  );
}

function Thumb({ left, top, color }: { left: number; top: number; color: string }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', left: left - 11, top: top - 11, width: 22, height: 22, borderRadius: 11,
        backgroundColor: color, borderWidth: 3, borderColor: '#fff',
        shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
      }}
    />
  );
}
