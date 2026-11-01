import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { C, Space } from '@/constants/theme';
import { prettyDay } from '@/lib/dates';
import { TIERS, type SessionRank } from '@/lib/tiers';

import { Row, Txt } from './ui';

const H = 150;
const PAD = 8; // keeps edge markers inside the plot
const LABEL_W = 58; // tier names on the left

/** Step line of your best rank after each session, plus a dot for what each session earned. Tap a column for details. */
export function RankHistoryChart({ history }: { history: SessionRank[] }) {
  const [width, setWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const n = history.length;
  const sel = history[selected ?? n - 1];

  // Show the ladder up to one tier above your best, so there's always somewhere to climb.
  const top = Math.min(TIERS.length - 1, Math.max(...history.map((h) => h.best.tierIndex)) + 1);
  const plotW = Math.max(0, width - LABEL_W);
  const step = n > 1 ? (plotW - PAD * 2) / (n - 1) : 0;
  const x = (i: number) => (n > 1 ? PAD + i * step : plotW / 2);
  const y = (score: number) => PAD + (1 - score / top) * (H - PAD * 2);

  const bestPath = history
    .map((h, i) => (i === 0 ? `M ${x(0)} ${y(h.best.score)}` : `H ${x(i)} V ${y(h.best.score)}`))
    .join(' ');

  return (
    <View style={{ gap: Space.sm }}>
      <View style={{ gap: 2 }}>
        <Txt>
          <Txt style={{ fontWeight: '700' }}>{sel.own.title}</Txt>
          <Txt color={C.textDim}>{`  ·  ${sel.own.current}  ·  ${prettyDay(sel.log.log_date)}`}</Txt>
        </Txt>
        <Txt variant="caption" color={C.textDim}>{`Best so far: ${sel.best.title}`}</Txt>
      </View>

      <View style={{ height: H, flexDirection: 'row' }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={{ width: LABEL_W }}>
          {TIERS.slice(0, top + 1).map((t, i) => (
            <Txt key={t.name} variant="caption" color={C.textFaint} style={{ position: 'absolute', top: y(i) - 7, fontSize: 10 }}>
              {t.name}
            </Txt>
          ))}
        </View>
        {plotW > 0 ? (
          <View style={{ width: plotW, height: H }}>
            <Svg width={plotW} height={H}>
              {TIERS.slice(0, top + 1).map((t, i) => (
                <Line key={t.name} x1={0} x2={plotW} y1={y(i)} y2={y(i)} stroke={C.border} strokeWidth={1} />
              ))}
              {selected !== null ? (
                <Line x1={x(selected)} x2={x(selected)} y1={0} y2={H} stroke={C.textFaint} strokeWidth={1} strokeDasharray="3 3" />
              ) : null}
              <Path d={bestPath} stroke={C.burn} strokeWidth={2} fill="none" strokeLinejoin="round" />
              {history.map((h, i) => (
                <Circle
                  key={h.log.id}
                  cx={x(i)}
                  cy={y(h.own.score)}
                  r={i === (selected ?? n - 1) ? 6 : 4}
                  fill={h.own.tier.color}
                  stroke={C.card}
                  strokeWidth={2}
                />
              ))}
            </Svg>
            {/* Hit targets: a full-height column per session, wider than the dot. */}
            {history.map((h, i) => (
              <Pressable
                key={h.log.id}
                onPress={() => setSelected(i)}
                style={{ position: 'absolute', top: 0, bottom: 0, left: x(i) - Math.max(step, 24) / 2, width: Math.max(step, 24) }}
              />
            ))}
          </View>
        ) : null}
      </View>

      <Row gap={Space.lg}>
        <Row gap={Space.xs}>
          <View style={{ width: 14, height: 2, backgroundColor: C.burn, borderRadius: 1 }} />
          <Txt variant="caption" color={C.textDim}>Best so far</Txt>
        </Row>
        <Row gap={Space.xs}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: C.textDim }} />
          <Txt variant="caption" color={C.textDim}>Each session (tier colour)</Txt>
        </Row>
      </Row>
      <Txt variant="caption" color={C.textFaint}>Tap a session to see it.</Txt>
    </View>
  );
}
