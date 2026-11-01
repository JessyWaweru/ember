import { router } from 'expo-router';
import { View } from 'react-native';

import { dialog } from '@/components/dialog';
import { pauseSpan } from '@/components/pause-banner';
import { Button, Card, Loading, PageHeader, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { useAllHabits, useArchiveHabit, useDeleteHabit, useHabitPauses, useRestoreHabit } from '@/lib/data';
import { WEEKDAY_LETTERS } from '@/lib/dates';
import { autoLabel, currentPauses, SECTIONS } from '@/lib/habits';
import type { Habit } from '@/lib/types';

function describe(h: Habit) {
  const type = h.auto ? `⚡ ${autoLabel(h.auto)}` : h.kind === 'bad' ? '🛡️ Quit' : h.target_count > 1 ? `✅ ${h.target_count}× a day` : '✅ Build';
  const days = h.days.length === 7 ? 'every day' : h.days.map((d) => WEEKDAY_LETTERS[d]).join(' ');
  const section = SECTIONS.find((s) => s.value === h.section)!.label.toLowerCase();
  return `${type} · ${days} · ${section}`;
}

function HabitRow({ habit, children, note }: { habit: Habit; children: React.ReactNode; note?: string }) {
  return (
    <Card style={{ gap: Space.md, padding: Space.md }}>
      <Row gap={Space.md}>
        <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: habit.color + '26', alignItems: 'center', justifyContent: 'center' }}>
          <Txt style={{ fontSize: 20 }}>{habit.emoji}</Txt>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt style={{ fontWeight: '700' }} numberOfLines={1}>{habit.name}</Txt>
          <Txt variant="caption" color={C.textDim}>{describe(habit)}</Txt>
          {note ? <Txt variant="caption" color={C.carbs} style={{ fontWeight: '700' }}>{note}</Txt> : null}
        </View>
      </Row>
      <Row gap={Space.sm}>{children}</Row>
    </Card>
  );
}

export default function HabitsManage() {
  const { data: all = [], isPending } = useAllHabits();
  const pauses = currentPauses(useHabitPauses().data ?? []);
  const archive = useArchiveHabit();
  const restore = useRestoreHabit();
  const del = useDeleteHabit();

  if (isPending) return <Loading />;
  const active = all.filter((h) => !h.archived);
  const archived = all.filter((h) => h.archived);

  const deleteForever = (h: Habit) =>
    dialog(`Delete "${h.name}" forever?`, 'Its whole history and streaks are erased. This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete forever', style: 'destructive', onPress: () => del.mutate(h.id) },
    ]);

  const remove = (h: Habit) =>
    dialog(`Remove "${h.name}"?`, 'Archive hides it but keeps its history, so you can bring it back. Delete erases everything.', [
      { text: 'Archive', onPress: () => archive.mutate(h.id) },
      { text: 'Delete forever', style: 'destructive', onPress: () => deleteForever(h) },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const pauseNote = (h: Habit) => {
    const p = pauses.find((x) => x.habit_id === h.id || x.habit_id === null);
    return p ? `⏸ Paused · “${p.reason}” · ${pauseSpan(p)}` : undefined;
  };

  return (
    <Screen back>
      <PageHeader kicker="YOUR LINEUP" title="Manage habits" tagline="Everything you’re building and breaking, in one list." color={C.habit} />

      <Button title="+ New habit" color={C.habit} onPress={() => router.push('/habit-edit')} />

      <SectionHeader title={`Active (${active.length})`} />
      {active.length === 0 ? <Txt color={C.textDim}>No habits yet.</Txt> : null}
      {active.map((h) => (
        <HabitRow key={h.id} habit={h} note={pauseNote(h)}>
          <Button title="Edit" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/habit-edit', params: { id: h.id } })} />
          <Button title="Pause" variant="secondary" style={{ flex: 1 }} onPress={() => router.push({ pathname: '/habit-pause', params: { habitId: h.id } })} />
          <Button title="Remove" variant="danger" style={{ flex: 1 }} onPress={() => remove(h)} />
        </HabitRow>
      ))}

      {archived.length ? (
        <>
          <SectionHeader title={`Archived (${archived.length})`} />
          <Txt variant="caption" color={C.textFaint}>Hidden from your day, history kept.</Txt>
          {archived.map((h) => (
            <HabitRow key={h.id} habit={h}>
              <Button title="Restore" variant="secondary" style={{ flex: 1 }} onPress={() => restore.mutate(h.id)} />
              <Button title="Delete forever" variant="danger" style={{ flex: 1 }} onPress={() => deleteForever(h)} />
            </HabitRow>
          ))}
        </>
      ) : null}
    </Screen>
  );
}
