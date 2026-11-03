import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, View, type ScrollViewInstance } from 'react-native';

import { dialog } from '@/components/dialog';
import { calorieCapDialog, isBlank, statusColor } from '@/components/habit-card';
import { Button, Card, IconButton, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { pauseSpan } from '@/components/pause-banner';
import { useArchiveHabit, useSetHabitLog } from '@/lib/data';
import { addDays, fromDateKey, prettyDay, toDateKey, todayKey, WEEKDAY_LETTERS } from '@/lib/dates';
import { autoLabel, dayStatus, habitStats, logsByDate, MILESTONES } from '@/lib/habits';
import type { Habit, HabitLog } from '@/lib/types';
import { useHabitData } from '@/lib/use-habit-data';
import { sound } from '@/lib/sound';

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Card style={{ flex: 1, padding: Space.md, gap: 2 }}>
      <Txt variant="title" color={color}>{value}</Txt>
      <Txt variant="caption" color={C.textDim}>{label}</Txt>
    </Card>
  );
}

function MonthCalendar({ habit, logs }: { habit: Habit; logs: Map<string, HabitLog> }) {
  const [offset, setOffset] = useState(0);
  const setLog = useSetHabitLog();
  const today = todayKey();
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells: (string | null)[] = [
    ...Array<null>(first.getDay()).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => toDateKey(new Date(first.getFullYear(), first.getMonth(), i + 1))),
  ];

  // Tapping a past day backfills it — handy when you forgot to check in. Auto and paused days fill themselves.
  function toggle(key: string) {
    if (key > today) return;
    const pause = logs.get(key)?.pause;
    if (pause) return dialog('Paused', `${pause.reason} · ${pauseSpan(pause)}`);
    const s = dayStatus(habit, logs.get(key), key);
    if (habit.auto === 'calorie_cap') return calorieCapDialog(habit, logs.get(key), s, key, setLog);
    if (habit.auto) return dialog(habit.name, `Tracked automatically (${autoLabel(habit.auto).toLowerCase()}).`);
    const base = { habit_id: habit.id, log_date: key };
    if (habit.kind === 'bad') {
      if (s === 'failed') sound.undo();
      else sound.slip();
      setLog.mutate(s === 'failed' ? { ...base, clear: true } : { ...base, count: 1, status: 'failed' });
    } else {
      if (s === 'done') sound.undo();
      else sound.complete();
      setLog.mutate(s === 'done' ? { ...base, clear: true } : { ...base, count: habit.target_count, status: 'done' });
    }
  }

  return (
    <Card style={{ gap: Space.md }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <IconButton icon="chevronLeft" onPress={() => setOffset(offset - 1)} />
        <Txt variant="heading">{first.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</Txt>
        <IconButton icon="chevronRight" onPress={() => offset < 0 && setOffset(offset + 1)} color={offset < 0 ? C.text : C.textFaint} />
      </Row>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {WEEKDAY_LETTERS.map((l, i) => (
          <Txt key={i} variant="caption" color={C.textFaint} style={{ width: `${100 / 7}%`, textAlign: 'center', marginBottom: 4 }}>{l}</Txt>
        ))}
        {cells.map((key, i) => {
          if (!key) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const s = dayStatus(habit, logs.get(key), key);
          const filled = s === 'done';
          return (
            <Pressable key={key} onPress={() => toggle(key)} style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              <View
                style={{
                  flex: 1, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: statusColor(s, habit.color),
                  // Today gets a bright ring; other unfinished days are an empty outline.
                  borderWidth: key === today ? 1.5 : s !== 'done' && s !== 'off' ? 1 : 0,
                  borderColor: key === today ? C.text : C.border,
                }}>
                <Txt variant="caption" color={filled ? '#0B0B0D' : s === 'off' ? C.textFaint : C.textDim} style={{ fontWeight: '700' }}>
                  {logs.get(key)?.pause ? '⏸' : s === 'skipped' ? '–' : s === 'failed' ? '✗' : String(fromDateKey(key).getDate())}
                </Txt>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Txt variant="caption" color={C.textFaint}>
        {habit.auto
          ? 'Filled in automatically. ✗ = slip, – = skipped, ⏸ = paused.'
          : habit.kind === 'bad'
            ? 'Tap a day to log or remove a slip. ✗ = slip, – = skipped, ⏸ = paused.'
            : 'Tap a past day to mark it done or undo it. – = skipped, ⏸ = paused.'}
      </Txt>
    </Card>
  );
}

function YearHeatmap({ habit, logs }: { habit: Habit; logs: Map<string, HabitLog> }) {
  const scroll = useRef<ScrollViewInstance>(null);
  const today = todayKey();
  // 53 week-columns ending this week, Sunday at the top.
  const lastSunday = addDays(today, -fromDateKey(today).getDay());
  const start = addDays(lastSunday, -52 * 7);
  const weeks = Array.from({ length: 53 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));

  return (
    <Card style={{ gap: Space.sm }}>
      <ScrollView ref={scroll} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: false })}>
        <Row gap={3} style={{ alignItems: 'flex-start' }}>
          {weeks.map((days) => (
            <View key={days[0]} style={{ gap: 3 }}>
              {days.map((k) => {
                const s = k > today ? 'off' : dayStatus(habit, logs.get(k), k);
                const log = logs.get(k);
                const partial = habit.kind === 'good' && s === 'open' && log?.status === 'done' && log.count > 0;
                return (
                  <View
                    key={k}
                    style={{
                      width: 11, height: 11, borderRadius: 3,
                      backgroundColor: partial ? habit.color : statusColor(s, habit.color),
                      borderWidth: !partial && isBlank(s) ? 1 : 0,
                      borderColor: C.border,
                      opacity: partial ? 0.25 + 0.5 * (log!.count / habit.target_count) : s === 'off' ? 0.4 : 1,
                    }}
                  />
                );
              })}
            </View>
          ))}
        </Row>
      </ScrollView>
      <Txt variant="caption" color={C.textFaint}>Last 12 months</Txt>
    </Card>
  );
}

export default function HabitDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { habits, logs: allLogs, pauses: allPauses, pausesReady, isPending } = useHabitData();
  const archive = useArchiveHabit();
  const habit = habits.find((h) => h.id === id);
  const pauses = allPauses.filter((p) => p.habit_id === null || p.habit_id === id);
  const logs = useMemo(() => logsByDate(id, allLogs), [id, allLogs]);

  if (isPending) return <Loading />;
  if (!habit) return <Screen back><Txt>Habit not found.</Txt></Screen>;
  const stats = habitStats(habit, logs);

  return (
    <Screen back>
      <View style={{ alignItems: 'center', gap: Space.sm }}>
        <View style={{ width: 80, height: 80, borderRadius: 26, backgroundColor: habit.color + '26', alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontSize: 40 }}>{habit.emoji}</Txt>
        </View>
        <Txt variant="title">{habit.name}</Txt>
        <Txt color={C.textDim}>
          {habit.auto ? `⚡ ${autoLabel(habit.auto)}` : habit.kind === 'bad' ? 'Quitting' : habit.target_count > 1 ? `${habit.target_count}× per day` : 'Daily habit'}
          {habit.days.length === 7 ? ' · every day' : ` · ${habit.days.map((d) => WEEKDAY_LETTERS[d]).join(' ')}`}
        </Txt>
      </View>

      <Row gap={Space.md}>
        <Stat label="Current streak" value={`🔥 ${stats.current}`} color={C.accent} />
        <Stat label="Best streak" value={String(stats.best)} />
      </Row>
      <Row gap={Space.md}>
        <Stat label={habit.kind === 'bad' ? 'Clean days' : 'Times done'} value={String(stats.total)} />
        <Stat label="Success (30 days)" value={`${Math.round(stats.rate30 * 100)}%`} color={habit.color} />
      </Row>
      <Row gap={Space.md}>
        <Stat label={`Days since you started (${prettyDay(stats.start)})`} value={String(stats.days)} />
        <Stat label="Success (all time)" value={`${Math.round(stats.rateAll * 100)}%`} color={habit.color} />
      </Row>

      <SectionHeader title="Achievements" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.md }}>
        {MILESTONES.map((m) => {
          const unlocked = stats.best >= m;
          return (
            <View key={m} style={{ alignItems: 'center', gap: 4, opacity: unlocked ? 1 : 0.3 }}>
              <View
                style={{
                  width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: unlocked ? C.accentSoft : C.cardHigh, borderWidth: 2, borderColor: unlocked ? C.accent : C.border,
                }}>
                <Txt style={{ fontSize: 22 }}>🔥</Txt>
              </View>
              <Txt variant="caption" style={{ fontWeight: '700' }}>{`${m} days`}</Txt>
            </View>
          );
        })}
      </ScrollView>

      <SectionHeader title="Calendar" />
      <MonthCalendar habit={habit} logs={logs} />

      <SectionHeader title="Year" />
      <YearHeatmap habit={habit} logs={logs} />

      <SectionHeader title={`Pauses (${pauses.length})`} />
      {pauses.length === 0 ? <Txt color={C.textDim}>No breaks taken. Pause this habit for rest days, illness or travel; paused days never break your streak.</Txt> : null}
      {pauses.map((p) => (
        <Card key={p.id} style={{ padding: Space.md, gap: 2 }}>
          <Txt style={{ fontWeight: '700' }}>{`⏸  “${p.reason}”`}</Txt>
          <Txt variant="caption" color={C.textDim}>{`${pauseSpan(p)}${p.habit_id === null ? ' · all habits' : ''}`}</Txt>
        </Card>
      ))}
      <Button
        title="⏸  Pause this habit"
        variant="secondary"
        onPress={() =>
          pausesReady
            ? router.push({ pathname: '/habit-pause', params: { habitId: habit.id } })
            : dialog('One-time setup needed', 'Run supabase/updates/001-habit-auto-and-pauses.sql in the Supabase SQL Editor, then try again.')
        }
      />
      <Button title="Edit habit" variant="secondary" onPress={() => router.push({ pathname: '/habit-edit', params: { id: habit.id } })} />
      <Button
        title="Archive habit"
        variant="danger"
        onPress={() =>
          dialog('Archive habit?', 'It disappears from your list. Your history is kept.', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Archive', style: 'destructive', onPress: () => archive.mutate(habit.id, { onSuccess: () => (sound.remove(), router.back()) }) },
          ])
        }
      />
    </Screen>
  );
}
