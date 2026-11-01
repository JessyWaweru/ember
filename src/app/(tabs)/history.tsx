import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { MealRow } from '@/components/meal-row';
import { Button, Card, PageHeader, Row, Screen, Segmented, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { useMealsRange, useProfile, useWeights, useWorkouts } from '@/lib/data';
import { addDays, dateRange, fromDateKey, prettyDay, todayKey } from '@/lib/dates';
import type { Meal } from '@/lib/types';

const CHART_H = 140;

function CaloriesChart({ days, totals, goal, selected, onSelect }: {
  days: string[]; totals: Map<string, number>; goal: number; selected: string | null; onSelect: (d: string) => void;
}) {
  const max = Math.max(goal * 1.25, ...days.map((d) => totals.get(d) ?? 0));
  const goalY = (goal / max) * CHART_H;
  const sel = selected ?? days[days.length - 1];
  const showEvery = days.length > 14 ? 7 : 1;

  return (
    <View style={{ gap: Space.sm }}>
      <Txt color={C.textDim}>
        <Txt style={{ fontWeight: '700' }}>{`${totals.get(sel) ?? 0} kcal`}</Txt>
        {`  ·  ${prettyDay(sel)}`}
      </Txt>
      <View style={{ height: CHART_H, flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
        {/* goal reference line */}
        <View
          pointerEvents="none"
          style={{ position: 'absolute', left: 0, right: 0, bottom: goalY, borderTopWidth: 1, borderStyle: 'dashed', borderColor: C.textFaint }}
        />
        {days.map((d) => {
          const v = totals.get(d) ?? 0;
          const active = d === sel;
          return (
            // The hit target is the full column height, not just the bar.
            <Pressable key={d} onPress={() => onSelect(d)} style={{ flex: 1, height: '100%', justifyContent: 'flex-end' }}>
              <View
                style={{
                  height: Math.max(v ? 3 : 0, (v / max) * CHART_H),
                  borderTopLeftRadius: 4,
                  borderTopRightRadius: 4,
                  backgroundColor: C.accent,
                  opacity: active ? 1 : 0.55,
                }}
              />
            </Pressable>
          );
        })}
      </View>
      <Row gap={2}>
        {days.map((d, i) => (
          <Txt key={d} variant="caption" color={C.textFaint} style={{ flex: 1, fontSize: 10, textAlign: 'center' }}>
            {i % showEvery === 0 ? String(fromDateKey(d).getDate()) : ''}
          </Txt>
        ))}
      </Row>
      <Txt variant="caption" color={C.textFaint}>{`Dashed line: ${goal} kcal goal. Tap a bar for that day.`}</Txt>
    </View>
  );
}

export default function History() {
  const [span, setSpan] = useState<'7' | '30'>('7');
  const [selected, setSelected] = useState<string | null>(null);
  const today = todayKey();
  const start = addDays(today, -(Number(span) - 1));
  const days = useMemo(() => dateRange(start, today), [start, today]);

  const profile = useProfile().data!;
  const { data: meals = [] } = useMealsRange(start, today);
  const { data: workouts = [] } = useWorkouts();
  const { data: weights = [] } = useWeights();

  const byDay = useMemo(() => {
    const m = new Map<string, Meal[]>();
    for (const meal of meals) m.set(meal.log_date, [...(m.get(meal.log_date) ?? []), meal]);
    return m;
  }, [meals]);
  const totals = useMemo(
    () => new Map([...byDay].map(([d, ms]) => [d, ms.reduce((s, x) => s + x.calories, 0)])),
    [byDay]
  );

  const logged = days.filter((d) => totals.has(d));
  const avg = logged.length ? Math.round(logged.reduce((s, d) => s + totals.get(d)!, 0) / logged.length) : 0;
  const burned = workouts.filter((w) => w.log_date >= start).reduce((s, w) => s + w.calories_burned, 0);
  const latest = weights[weights.length - 1];
  const first = weights[0];

  return (
    <Screen tabs>
      <PageHeader kicker="LOOK BACK" title="History" tagline="Every meal, every trend, every kilo." color={C.fat} />
      <Segmented value={span} onChange={(v) => { setSpan(v); setSelected(null); }} options={[{ value: '7', label: '7 days' }, { value: '30', label: '30 days' }]} />

      <Card style={{ gap: Space.md }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <View>
            <Txt variant="caption" color={C.textDim}>Daily average</Txt>
            <Txt variant="title">{avg}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="caption" color={C.textDim}>Days logged</Txt>
            <Txt variant="title">{`${logged.length}/${days.length}`}</Txt>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Txt variant="caption" color={C.textDim}>Burned</Txt>
            <Txt variant="title" color={C.burn}>{burned}</Txt>
          </View>
        </Row>
        <CaloriesChart days={days} totals={totals} goal={profile.calorie_goal} selected={selected} onSelect={setSelected} />
      </Card>

      <Card style={{ gap: Space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt variant="heading">⚖️ Weight</Txt>
          <Txt color={C.accent} style={{ fontWeight: '700' }} onPress={() => router.push('/weight')}>+ Log</Txt>
        </Row>
        {latest ? (
          <Row gap={Space.xl}>
            <View>
              <Txt variant="title">{`${latest.weight_kg} kg`}</Txt>
              <Txt variant="caption" color={C.textDim}>{prettyDay(latest.log_date)}</Txt>
            </View>
            {first && first.id !== latest.id ? (
              <View>
                <Txt variant="title" color={C.textDim}>
                  {`${latest.weight_kg - first.weight_kg > 0 ? '+' : ''}${(latest.weight_kg - first.weight_kg).toFixed(1)} kg`}
                </Txt>
                <Txt variant="caption" color={C.textDim}>since {prettyDay(first.log_date)}</Txt>
              </View>
            ) : null}
            {profile.goal_weight_kg ? (
              <View>
                <Txt variant="title" color={C.textDim}>{`${profile.goal_weight_kg} kg`}</Txt>
                <Txt variant="caption" color={C.textDim}>goal</Txt>
              </View>
            ) : null}
          </Row>
        ) : (
          <Txt color={C.textDim}>No weigh-ins yet.</Txt>
        )}
      </Card>

      {[...days].reverse().filter((d) => byDay.has(d)).map((d) => (
        <Card key={d} style={{ gap: Space.xs }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="heading">{prettyDay(d)}</Txt>
            <Txt color={(totals.get(d) ?? 0) > profile.calorie_goal ? C.danger : C.textDim}>{`${totals.get(d)} kcal`}</Txt>
          </Row>
          {byDay.get(d)!.map((m) => <MealRow key={m.id} meal={m} />)}
        </Card>
      ))}
      {logged.length === 0 ? <Button title="Log your first meal" onPress={() => router.push('/add-meal')} /> : null}
    </Screen>
  );
}
