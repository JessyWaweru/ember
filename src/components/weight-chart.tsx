import { useMemo, useState } from 'react';
import { View, type GestureResponderEvent, type ViewStyle } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { C, Space } from '@/constants/theme';
import { addDays, fromDateKey, prettyDay, todayKey } from '@/lib/dates';
import type { WeightLog } from '@/lib/types';

import { Row, Segmented, Txt } from './ui';

type Range = '10' | '30' | '90' | '365' | 'all';
const RANGES: { value: Range; label: string }[] = [
  { value: '10', label: '10d' },
  { value: '30', label: '30d' },
  { value: '90', label: '90d' },
  { value: '365', label: '1y' },
  { value: 'all', label: 'All' },
];
const H = 160;
const PAD_Y = 12;
const PAD_X = 8; // keeps edge dots whole
const MAX_DOTS = 30; // beyond this, the line reads better alone
const LABEL_W = 44;
const noScroll = { touchAction: 'none' } as unknown as ViewStyle;

const DAY_MS = 86_400_000;
const dayNum = (key: string) => Math.round(fromDateKey(key).getTime() / DAY_MS);
const kg = (n: number) => `${Math.round(n * 10) / 10} kg`;
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : '±'}${Math.abs(Math.round(n * 10) / 10)} kg`;

/** Weight over a chosen range: line spaced by real dates, goal line, drag to read any weigh-in. */
export function WeightChart({ weights, goalKg }: { weights: WeightLog[]; goalKg: number | null }) {
  const [range, setRange] = useState<Range>('30');
  const [width, setWidth] = useState(0);
  const [sel, setSel] = useState<number | null>(null);

  const points = useMemo(() => {
    const sorted = [...weights].sort((a, b) => a.log_date.localeCompare(b.log_date));
    const from = range === 'all' ? '' : addDays(todayKey(), -(Number(range) - 1));
    return sorted.filter((w) => w.log_date >= from);
  }, [weights, range]);

  const plotW = Math.max(0, width - LABEL_W);
  const first = points[0];
  const last = points[points.length - 1];

  // Time axis from the first weigh-in in range (or the range start) to today; weight axis padded around the data.
  const x0 = range === 'all' ? (first ? dayNum(first.log_date) : dayNum(todayKey())) : dayNum(addDays(todayKey(), -(Number(range) - 1)));
  const x1 = Math.max(dayNum(todayKey()), x0 + 1);
  const values = points.map((p) => p.weight_kg);
  const goalNear = goalKg !== null && values.length > 0 && goalKg >= Math.min(...values) - 3 && goalKg <= Math.max(...values) + 3;
  const lo = Math.min(...values, ...(goalNear ? [goalKg!] : [])) - 0.5;
  const hi = Math.max(...values, ...(goalNear ? [goalKg!] : [])) + 0.5;
  const x = (key: string) => PAD_X + ((dayNum(key) - x0) / (x1 - x0)) * (plotW - PAD_X * 2);
  // Long ranges span years, so their dates say which.
  const day = (key: string) =>
    range === '365' || range === 'all'
      ? fromDateKey(key).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
      : prettyDay(key);
  const y = (v: number) => PAD_Y + (1 - (v - lo) / (hi - lo)) * (H - PAD_Y * 2);

  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.log_date).toFixed(1)} ${y(p.weight_kg).toFixed(1)}`).join(' ');
  const shown = sel !== null && points[sel] ? points[sel] : last;
  const change = first && last ? last.weight_kg - first.weight_kg : 0;
  const weeks = first && last ? (dayNum(last.log_date) - dayNum(first.log_date)) / 7 : 0;

  // Drag across the chart to the nearest weigh-in.
  const pickAt = (e: GestureResponderEvent) => {
    const px = e.nativeEvent.locationX;
    let best = 0;
    points.forEach((p, i) => {
      if (Math.abs(x(p.log_date) - px) < Math.abs(x(points[best].log_date) - px)) best = i;
    });
    setSel(best);
  };

  return (
    <View style={{ gap: Space.md }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <Segmented value={range} onChange={(r) => { setRange(r); setSel(null); }} options={RANGES} />

      {points.length === 0 ? (
        <Txt color={C.textDim}>No weigh-ins in this range.</Txt>
      ) : (
        <>
          <View style={{ gap: 2 }}>
            <Txt>
              <Txt variant="label">{kg(shown.weight_kg)}</Txt>
              <Txt color={C.textDim}>{`  ·  ${day(shown.log_date)}`}</Txt>
            </Txt>
            {shown !== first ? (
              <Txt variant="caption" color={C.textDim}>{`${signed(shown.weight_kg - first.weight_kg)} since ${day(first.log_date)}`}</Txt>
            ) : (
              <Txt variant="caption" color={C.textDim}>{points.length === 1 ? 'Only weigh-in in this range' : 'Start of this range'}</Txt>
            )}
          </View>

          {plotW > 0 ? (
            <Row gap={0} style={{ alignItems: 'stretch' }}>
              <View style={{ width: LABEL_W, height: H }}>
                <Txt variant="caption" color={C.textFaint} style={{ position: 'absolute', top: y(hi - 0.5) - 8, fontSize: 10 }}>{kg(hi - 0.5)}</Txt>
                <Txt variant="caption" color={C.textFaint} style={{ position: 'absolute', top: y(lo + 0.5) - 8, fontSize: 10 }}>{kg(lo + 0.5)}</Txt>
              </View>
              <View
                style={[{ width: plotW, height: H }, noScroll]}
                onStartShouldSetResponder={() => true}
                onMoveShouldSetResponder={() => true}
                onResponderTerminationRequest={() => false}
                onResponderGrant={pickAt}
                onResponderMove={pickAt}>
                <View pointerEvents="none">
                  <Svg width={plotW} height={H}>
                    {[hi - 0.5, lo + 0.5].map((v) => (
                      <Line key={v} x1={0} x2={plotW} y1={y(v)} y2={y(v)} stroke={C.border} strokeWidth={1} />
                    ))}
                    {goalNear ? (
                      <Line x1={0} x2={plotW} y1={y(goalKg!)} y2={y(goalKg!)} stroke={C.burn} strokeWidth={1.5} strokeDasharray="5 4" />
                    ) : null}
                    {sel !== null ? (
                      <Line x1={x(shown.log_date)} x2={x(shown.log_date)} y1={0} y2={H} stroke={C.textFaint} strokeWidth={1} strokeDasharray="3 3" />
                    ) : null}
                    <Path d={path} stroke={C.fat} strokeWidth={2} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                    {points.length <= MAX_DOTS || sel !== null
                      ? points.map((p) =>
                          points.length <= MAX_DOTS || p === shown ? (
                            <Circle key={p.id} cx={x(p.log_date)} cy={y(p.weight_kg)} r={p === shown ? 6 : 4} fill={C.fat} stroke={C.card} strokeWidth={2} />
                          ) : null
                        )
                      : null}
                  </Svg>
                </View>
              </View>
            </Row>
          ) : null}

          <Row style={{ justifyContent: 'space-between', marginLeft: LABEL_W }}>
            <Txt variant="caption" color={C.textFaint} style={{ fontSize: 10 }}>{day(range === 'all' && first ? first.log_date : addDays(todayKey(), -(Number(range) - 1)))}</Txt>
            <Txt variant="caption" color={C.textFaint} style={{ fontSize: 10 }}>Today</Txt>
          </Row>

          {points.length > 1 ? (
            <Row gap={Space.xl}>
              <View>
                <Txt variant="label">{signed(change)}</Txt>
                <Txt variant="caption" color={C.textDim}>change in range</Txt>
              </View>
              {weeks >= 1 ? (
                <View>
                  <Txt variant="label">{`${signed(change / weeks)}/wk`}</Txt>
                  <Txt variant="caption" color={C.textDim}>average pace</Txt>
                </View>
              ) : null}
              {goalKg !== null ? (
                <View>
                  <Txt variant="label">{signed(goalKg - last.weight_kg).replace(/^[+−±]/, '')}</Txt>
                  <Txt variant="caption" color={C.textDim}>{`to goal (${kg(goalKg)})`}</Txt>
                </View>
              ) : null}
            </Row>
          ) : null}
          <Txt variant="caption" color={C.textFaint}>
            {goalNear ? 'Dashed line: your goal. ' : ''}Touch and drag across the chart to read any weigh-in.
          </Txt>
        </>
      )}
    </View>
  );
}
