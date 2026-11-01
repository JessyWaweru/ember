import { router } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { pauseSpan, pauseTarget } from '@/components/pause-banner';
import { Bar, Card, Empty, Loading, PageHeader, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { addDays, fromDateKey, todayKey } from '@/lib/dates';
import { habitStats, logsByDate, overallStats } from '@/lib/habits';
import { useHabitData } from '@/lib/use-habit-data';

const pct = (r: number | null) => (r === null ? '–' : `${Math.round(r * 100)}%`);
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const CHART_H = 110;

function Tile({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <Card style={{ flex: 1, padding: Space.md, gap: 2 }}>
      <Txt variant="title" color={color}>{value}</Txt>
      <Txt variant="caption" color={C.textDim}>{label}</Txt>
    </Card>
  );
}

/** Completion-rate columns (0–100%); tap one to read it. Empty periods show as a faint stub. */
function RateBars({ items, initial }: { items: { key: string; label: string; rate: number | null; detail: string }[]; initial: number }) {
  const [sel, setSel] = useState(initial);
  const cur = items[sel];
  return (
    <View style={{ gap: Space.sm }}>
      <Txt>
        <Txt style={{ fontWeight: '700' }}>{pct(cur.rate)}</Txt>
        <Txt color={C.textDim}>{`  ·  ${cur.detail}`}</Txt>
      </Txt>
      <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 3 }}>
        {/* 100% reference line */}
        <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.border }} />
        {items.map((it, i) => (
          <Pressable key={it.key} onPress={() => setSel(i)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
            <View
              style={{
                height: it.rate === null ? 3 : Math.max(3, it.rate * CHART_H),
                borderTopLeftRadius: 4,
                borderTopRightRadius: 4,
                backgroundColor: it.rate === null ? C.cardHigh : C.habit,
                opacity: i === sel ? 1 : 0.55,
              }}
            />
          </Pressable>
        ))}
      </View>
      <Row gap={3}>
        {items.map((it) => (
          <Txt key={it.key} variant="caption" color={C.textFaint} style={{ flex: 1, fontSize: 10, textAlign: 'center' }}>{it.label}</Txt>
        ))}
      </Row>
    </View>
  );
}

/** Six months of days, shaded by how much of the day's habits you got done. */
function OverallHeatmap({ daily }: { daily: Map<string, number | null> }) {
  const scroll = useRef<ScrollViewInstance>(null);
  const today = todayKey();
  const lastSunday = addDays(today, -fromDateKey(today).getDay());
  const start = addDays(lastSunday, -25 * 7);
  const weeks = Array.from({ length: 26 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  return (
    <View style={{ gap: Space.sm }}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <Row gap={3} style={{ alignItems: 'flex-start' }}>
          {weeks.map((days) => (
            <View key={days[0]} style={{ gap: 3 }}>
              {days.map((k) => {
                const r = k > today ? null : daily.get(k) ?? null;
                return (
                  <View
                    key={k}
                    style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: r === null || r === 0 ? C.cardHigh : C.habit, opacity: r === null ? 0.4 : r === 0 ? 1 : 0.25 + 0.75 * r }}
                  />
                );
              })}
            </View>
          ))}
        </Row>
      </ScrollView>
      <Row gap={Space.xs}>
        <Txt variant="caption" color={C.textFaint}>Less</Txt>
        {[0, 0.33, 0.66, 1].map((r) => (
          <View key={r} style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: r === 0 ? C.cardHigh : C.habit, opacity: r === 0 ? 1 : 0.25 + 0.75 * r }} />
        ))}
        <Txt variant="caption" color={C.textFaint}>More · last 6 months</Txt>
      </Row>
    </View>
  );
}

export default function HabitsStats() {
  const { habits, logs, pauses, isPending } = useHabitData();
  const stats = useMemo(() => overallStats(habits, logs), [habits, logs]);
  const perHabit = useMemo(
    () => habits.map((h) => ({ h, s: habitStats(h, logsByDate(h.id, logs)) })).sort((a, b) => b.s.rate30 - a.s.rate30),
    [habits, logs]
  );

  if (isPending) return <Loading />;
  if (habits.length === 0) {
    return (
      <Screen back>
        <Empty icon="📊" title="No stats yet" body="Add a habit and your numbers start here." />
      </Screen>
    );
  }

  const weekly = stats.weekly.map((w, i) => ({
    key: w.start,
    // Label every third week, counting back from this one.
    label: (stats.weekly.length - 1 - i) % 3 === 0 ? fromDateKey(w.start).toLocaleDateString(undefined, { day: 'numeric', month: 'numeric' }) : '',
    rate: w.rate,
    detail: i === stats.weekly.length - 1 ? 'this week' : `week of ${fromDateKey(w.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`,
  }));
  const weekdays = stats.byWeekday.map((r, d) => ({ key: String(d), label: WEEKDAYS[d][0], rate: r, detail: `${WEEKDAYS[d]}s, last 12 weeks` }));
  const best = weekdays.reduce((b, w, i) => ((w.rate ?? -1) > (weekdays[b].rate ?? -1) ? i : b), 0);
  const worst = weekdays.reduce((b, w, i) => (w.rate !== null && w.rate < (weekdays[b].rate ?? 2) ? i : b), 0);

  return (
    <Screen back>
      <PageHeader kicker="THE NUMBERS" title="Habit stats" tagline="Where you’re consistent, and where you slip." color={C.habit} />

      <Row gap={Space.md}>
        <Tile value={pct(stats.rate30)} label="Done, last 30 days" color={C.habit} />
        <Tile value={`🔥 ${stats.perfectCurrent}`} label="Perfect-day streak" color={C.accent} />
      </Row>
      <Row gap={Space.md}>
        <Tile value={String(stats.perfectBest)} label="Best perfect streak" />
        <Tile value={String(stats.perfect30)} label="Perfect days (30d)" />
        <Tile value={String(stats.wins)} label="Total wins" />
      </Row>

      <SectionHeader title="Weekly completion" />
      <Card>
        <RateBars items={weekly} initial={weekly.length - 1} />
      </Card>

      <SectionHeader title="By day of week" />
      <Card style={{ gap: Space.sm }}>
        <RateBars items={weekdays} initial={best} />
        {weekdays[best].rate !== null && best !== worst ? (
          <Txt variant="caption" color={C.textDim}>{`Strongest on ${WEEKDAYS[best]}s, weakest on ${WEEKDAYS[worst]}s.`}</Txt>
        ) : null}
      </Card>

      <SectionHeader title="Every day" />
      <Card>
        <OverallHeatmap daily={stats.daily} />
      </Card>

      <SectionHeader title="Habit by habit" />
      {perHabit.map(({ h, s }) => (
        <Card key={h.id} style={{ padding: Space.md, gap: Space.sm }} onPress={() => router.push({ pathname: '/habit/[id]', params: { id: h.id } })}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt style={{ fontWeight: '700', flex: 1 }} numberOfLines={1}>{`${h.emoji}  ${h.name}`}</Txt>
            <Txt style={{ fontWeight: '700' }}>{pct(s.rate30)}</Txt>
          </Row>
          <Bar progress={s.rate30} color={h.color} />
          <Txt variant="caption" color={C.textDim}>{`🔥 ${s.current} now · best ${s.best} · ${s.total} ${h.kind === 'bad' ? 'clean days' : 'times done'}`}</Txt>
        </Card>
      ))}

      <SectionHeader title={`Pauses (${pauses.length})`} />
      {pauses.length === 0 ? <Txt color={C.textDim}>No breaks taken yet.</Txt> : null}
      {pauses.map((p) => (
        <Card key={p.id} style={{ padding: Space.md, gap: 2 }}>
          <Txt style={{ fontWeight: '700' }}>{`⏸  “${p.reason}”`}</Txt>
          <Txt variant="caption" color={C.textDim}>{`${pauseTarget(p, habits)} · ${pauseSpan(p)}`}</Txt>
        </Card>
      ))}
      <Txt variant="caption" color={C.textFaint}>Completion counts each scheduled habit from the day you added it. Skipped and paused days are left out.</Txt>
    </Screen>
  );
}
