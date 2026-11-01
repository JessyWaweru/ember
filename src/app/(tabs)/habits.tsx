import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';

import { dialog } from '@/components/dialog';
import { HabitCard } from '@/components/habit-card';
import { PauseBanner } from '@/components/pause-banner';
import { Button, Empty, IconButton, PageHeader, Ring, Row, Screen, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { addDays, fromDateKey, prettyDay, todayKey, WEEKDAY_LETTERS, weekday } from '@/lib/dates';
import { currentPauses, dayStatus, logsByDate, perfectDayStreak, SECTIONS } from '@/lib/habits';
import { useHabitData } from '@/lib/use-habit-data';

export default function Habits() {
  const today = todayKey();
  const [date, setDate] = useState(today);
  const { habits, logs, pauses, pausesReady, isPending } = useHabitData();

  const maps = useMemo(() => new Map(habits.map((h) => [h.id, logsByDate(h.id, logs)])), [habits, logs]);
  const perfect = useMemo(() => perfectDayStreak(habits, logs), [habits, logs]);

  /** Fraction of the day's relevant habits that are done. */
  const progressOn = (d: string) => {
    const states = habits.map((h) => dayStatus(h, maps.get(h.id)?.get(d), d)).filter((s) => s !== 'off' && s !== 'skipped');
    return states.length ? states.filter((s) => s === 'done').length / states.length : 0;
  };

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const todays = habits
    .map((h) => ({ h, s: dayStatus(h, maps.get(h.id)?.get(date), date) }))
    .filter(({ h, s }) => s !== 'off' || h.days.includes(weekday(date)));
  const doneCount = todays.filter((x) => x.s === 'done').length;
  const countable = todays.filter((x) => x.s !== 'skipped').length;

  return (
    <Screen tabs>
      <PageHeader
        kicker="BUILD · BREAK"
        title="Habits"
        tagline={perfect > 0 ? `🔥 ${perfect} perfect day${perfect === 1 ? '' : 's'} in a row. Keep it lit.` : 'Small wins, stacked daily.'}
        color={C.habit}
        right={
          <>
            <IconButton icon="chart" onPress={() => router.push('/habits-stats')} />
            <IconButton icon="list" onPress={() => router.push('/habits-manage')} />
            <IconButton icon="plus" bg={C.habit} color="#0B0B0D" onPress={() => router.push('/habit-edit')} />
          </>
        }
      />

      <PauseBanner pauses={currentPauses(pauses)} habits={habits} />

      {/* week strip */}
      <Row style={{ justifyContent: 'space-between' }}>
        {week.map((d) => {
          const active = d === date;
          return (
            <Pressable key={d} onPress={() => setDate(d)} style={{ alignItems: 'center', gap: 4 }}>
              <Txt variant="caption" color={active ? C.text : C.textDim} style={{ fontWeight: '700', fontSize: 11 }}>
                {WEEKDAY_LETTERS[weekday(d)]}
              </Txt>
              <Ring size={40} stroke={3.5} progress={progressOn(d)} color={C.habit} track={active ? C.border : C.cardHigh}>
                <Txt variant="caption" style={{ fontWeight: active ? '800' : '500' }} color={active ? C.text : C.textDim}>
                  {String(fromDateKey(d).getDate())}
                </Txt>
              </Ring>
            </Pressable>
          );
        })}
      </Row>

      {habits.length > 0 ? (
        <Txt color={C.textDim}>
          {`${prettyDay(date)} · ${doneCount}/${countable} done`}
          {countable > 0 && doneCount === countable ? '  ✨ Perfect day!' : ''}
        </Txt>
      ) : null}

      {!isPending && habits.length === 0 ? (
        <>
          <Empty icon="✨" title="Build your first habit" body="Small daily wins add up. Start with one or two — you can always add more." />
          <Button title="Add a habit" color={C.habit} onPress={() => router.push('/habit-edit')} />
        </>
      ) : null}

      {SECTIONS.map((sec) => {
        const items = todays
          .filter(({ h }) => h.section === sec.value)
          // Completed habits sink to the bottom, like GRIT.
          .sort((a, b) => Number(a.s === 'done') - Number(b.s === 'done') || a.h.sort_order - b.h.sort_order);
        if (items.length === 0) return null;
        return (
          <View key={sec.value} style={{ gap: Space.sm }}>
            <Txt variant="caption" color={C.textDim} style={{ fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>
              {`${sec.emoji}  ${sec.label}`}
            </Txt>
            {items.map(({ h }) => <HabitCard key={h.id} habit={h} logs={maps.get(h.id)!} date={date} />)}
          </View>
        );
      })}

      {habits.length > 0 && todays.length === 0 ? <Txt color={C.textDim}>Nothing scheduled for this day. Rest up.</Txt> : null}
      {habits.length > 0 ? (
        <>
          <Button
            title="⏸  Take a rest day / pause habits"
            variant="secondary"
            onPress={() =>
              pausesReady
                ? router.push('/habit-pause')
                : dialog('One-time setup needed', 'Run supabase/updates/001-habit-auto-and-pauses.sql in the Supabase SQL Editor, then try again.')
            }
          />
          <Txt variant="caption" color={C.textFaint} style={{ textAlign: 'center' }}>
            Tap ✓ to complete · tap a card for stats · long-press to skip
          </Txt>
        </>
      ) : null}
    </Screen>
  );
}
