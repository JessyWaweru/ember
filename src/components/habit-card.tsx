import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { dialog } from '@/components/dialog';
import { C, Radius, Space } from '@/constants/theme';
import { useSetHabitLog } from '@/lib/data';
import { addDays, prettyDay, WEEKDAY_LETTERS, weekday } from '@/lib/dates';
import { autoLabel, dayStatus, habitStats, type DayStatus } from '@/lib/habits';
import type { Habit, HabitLog } from '@/lib/types';

import { Icon, Ring, Row, tap, Txt } from './ui';

// Only completed days are filled; everything else (missed, slipped, skipped) is an empty outline.
export function statusColor(status: DayStatus, color: string) {
  return status === 'done' ? color : 'transparent';
}
export const isBlank = (status: DayStatus) => status !== 'done';

export function HabitCard({ habit, logs, date }: { habit: Habit; logs: Map<string, HabitLog>; date: string }) {
  const setLog = useSetHabitLog();
  const log = logs.get(date);
  const status = dayStatus(habit, log, date);
  const stats = habitStats(habit, logs);
  const count = log?.status === 'done' ? log.count : 0;
  const counted = habit.kind === 'good' && habit.target_count > 1;
  const base = { habit_id: habit.id, log_date: date };

  const pause = log?.pause;

  function press() {
    tap();
    if (pause) return dialog(`${habit.name} is paused`, `${pause.reason}. Paused days never break your streak.`);
    // Auto habits are ticked by what you log; a manual skip can still be undone.
    if (habit.auto && status !== 'skipped') {
      return habit.auto === 'calorie_cap'
        ? dialog(habit.name, 'Tracked from your food log: a day over your calorie budget (goal + burned) counts as a slip.')
        : dialog(habit.name, `Ticks itself off when you log ${habit.auto === 'cardio' ? 'a cardio' : 'a weights or bodyweight'} workout.`, [
            { text: 'Not now', style: 'cancel' },
            { text: 'Log workout', onPress: () => router.push({ pathname: '/log-workout', params: { date } }) },
          ]);
    }
    if (status === 'skipped') return setLog.mutate({ ...base, clear: true });
    if (habit.kind === 'bad') {
      if (status === 'failed') return setLog.mutate({ ...base, clear: true });
      return dialog(`Slipped on "${habit.name}"?`, 'This resets your streak.', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log slip', style: 'destructive', onPress: () => setLog.mutate({ ...base, count: 1, status: 'failed' }) },
      ]);
    }
    if (status === 'done') return setLog.mutate({ ...base, clear: true });
    setLog.mutate({ ...base, count: counted ? count + 1 : 1, status: 'done' });
  }

  function menu() {
    tap();
    if (pause) return press();
    dialog(habit.name, prettyDay(date), [
      status === 'skipped'
        ? { text: 'Unskip', onPress: () => setLog.mutate({ ...base, clear: true }) }
        : { text: 'Skip day', onPress: () => setLog.mutate({ ...base, count: 0, status: 'skipped' }) },
      ...(counted && count > 0
        ? [{ text: 'Minus one', onPress: () => setLog.mutate(count - 1 > 0 ? { ...base, count: count - 1, status: 'done' } : { ...base, clear: true }) }]
        : log ? [{ text: 'Reset day', style: 'destructive' as const, onPress: () => setLog.mutate({ ...base, clear: true }) }] : []),
      { text: 'Cancel', style: 'cancel' },
    ]);
  }

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(date, i - 6));
  const done = status === 'done';

  return (
    <Pressable
      onPress={() => router.push({ pathname: '/habit/[id]', params: { id: habit.id } })}
      onLongPress={menu}
      style={({ pressed }) => ({
        // Every card wears its habit's colour: a soft wash, and a border that brightens once it's done.
        backgroundColor: habit.color + '14',
        borderRadius: Radius.md,
        padding: Space.md,
        borderWidth: 1,
        borderColor: habit.color + (done ? 'AA' : '55'),
        opacity: pressed ? 0.85 : status === 'skipped' ? (pause ? 0.8 : 0.6) : 1,
      })}>
      <Row gap={Space.md}>
        <View
          style={{
            width: 44, height: 44, borderRadius: 14, backgroundColor: habit.color + '26',
            alignItems: 'center', justifyContent: 'center',
          }}>
          <Txt style={{ fontSize: 22 }}>{habit.emoji}</Txt>
        </View>

        <View style={{ flex: 1, gap: 4 }}>
          <Txt numberOfLines={1} style={{ fontWeight: '700', textDecorationLine: done && habit.kind === 'good' ? 'line-through' : 'none' }} color={done && habit.kind === 'good' ? C.textDim : C.text}>
            {habit.name}
          </Txt>
          <Row gap={Space.sm}>
            {stats.current > 0 ? <Txt variant="caption" color={C.accent} style={{ fontWeight: '700' }}>{`🔥 ${stats.current}`}</Txt> : null}
            {counted ? <Txt variant="caption" color={C.textDim}>{`${count}/${habit.target_count}`}</Txt> : null}
            {habit.kind === 'bad' ? <Txt variant="caption" color={C.textDim}>{status === 'failed' ? 'Slipped' : 'Clean'}</Txt> : null}
            {status === 'skipped' && !pause ? <Txt variant="caption" color={C.textDim}>Skipped</Txt> : null}
            {habit.auto && !pause ? <Txt variant="caption" color={C.textFaint}>{`⚡ Auto · ${autoLabel(habit.auto).toLowerCase()}`}</Txt> : null}
          </Row>
          {pause ? (
            <Txt variant="caption" color={C.carbs} numberOfLines={1} style={{ fontWeight: '700' }}>{`⏸ Paused · ${pause.reason}`}</Txt>
          ) : null}
          <Row gap={3}>
            {last7.map((d) => {
              const s = dayStatus(habit, logs.get(d), d);
              return (
                <View key={d} style={{ alignItems: 'center', gap: 2 }}>
                  <View
                    style={{
                      width: 14, height: 14, borderRadius: 4, backgroundColor: statusColor(s, habit.color),
                      borderWidth: isBlank(s) ? 1 : 0, borderColor: habit.color + '66', opacity: s === 'off' ? 0.35 : 1,
                    }}
                  />
                  <Txt style={{ fontSize: 8, color: C.textFaint }}>{WEEKDAY_LETTERS[weekday(d)]}</Txt>
                </View>
              );
            })}
          </Row>
        </View>

        <Pressable onPress={press} onLongPress={menu} hitSlop={10}>
          {counted && !done ? (
            <Ring size={46} stroke={5} progress={count / habit.target_count} color={habit.color}>
              <Icon name="plus" size={18} color={habit.color} />
            </Ring>
          ) : (
            <View
              style={{
                width: 46, height: 46, borderRadius: 23,
                backgroundColor: status === 'failed' ? C.danger : done ? habit.color : 'transparent',
                borderWidth: done || status === 'failed' ? 0 : 2,
                borderColor: C.border,
                alignItems: 'center', justifyContent: 'center',
              }}>
              {pause ? (
                <Icon name="pause" size={18} color={C.carbs} />
              ) : habit.kind === 'bad' ? (
                <Txt style={{ fontSize: 18 }}>{status === 'failed' ? '✗' : '🛡️'}</Txt>
              ) : (
                <Icon name="check" size={20} color={done ? '#0B0B0D' : C.textFaint} />
              )}
            </View>
          )}
        </Pressable>
      </Row>
    </Pressable>
  );
}
