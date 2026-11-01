import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { dialog } from '@/components/dialog';
import { Button, Card, Chip, Field, Screen, SheetHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { useAddPauses, useHabits } from '@/lib/data';
import { addDays, prettyDay, todayKey } from '@/lib/dates';
import { PAUSE_REASONS } from '@/lib/habits';

const LENGTHS = [
  { label: '1 day', days: 1 },
  { label: '3 days', days: 3 },
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: 'Until I resume', days: null },
] as const;

export default function HabitPause() {
  const { habitId } = useLocalSearchParams<{ habitId?: string }>();
  const { data: habits = [] } = useHabits();
  const add = useAddPauses();

  // Empty selection = every habit.
  const [picked, setPicked] = useState<string[]>(habitId ? [habitId] : []);
  const [startsTomorrow, setStartsTomorrow] = useState(false);
  const [length, setLength] = useState<number | null>(1);
  const [reason, setReason] = useState('');

  const start = startsTomorrow ? addDays(todayKey(), 1) : todayKey();
  const end = length === null ? null : addDays(start, length - 1);
  const toggle = (id: string) => setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id]);

  async function save() {
    if (!reason.trim()) return dialog('Why the pause?', 'Add a reason so future you knows what happened.');
    const base = { start_date: start, end_date: end, reason: reason.trim() };
    try {
      await add.mutateAsync(picked.length ? picked.map((habit_id) => ({ ...base, habit_id })) : [{ ...base, habit_id: null }]);
      router.back();
    } catch (e) {
      dialog('Could not pause', (e as Error).message);
    }
  }

  return (
    <Screen>
      <SheetHeader title="Pause habits" />
      <Txt color={C.textDim}>Rest days, illness, travel: paused days never break a streak, and the reason stays on record.</Txt>

      <Card style={{ gap: Space.md }}>
        <Txt variant="caption" color={C.textDim}>Which habits</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
          <Chip label="All habits" active={picked.length === 0} color={C.carbs} onPress={() => setPicked([])} />
          {habits.map((h) => (
            <Chip key={h.id} label={`${h.emoji} ${h.name}`} active={picked.includes(h.id)} color={C.carbs} onPress={() => toggle(h.id)} />
          ))}
        </View>

        <Txt variant="caption" color={C.textDim}>Starting</Txt>
        <View style={{ flexDirection: 'row', gap: Space.sm }}>
          <Chip label="Today" active={!startsTomorrow} color={C.carbs} onPress={() => setStartsTomorrow(false)} />
          <Chip label="Tomorrow" active={startsTomorrow} color={C.carbs} onPress={() => setStartsTomorrow(true)} />
        </View>

        <Txt variant="caption" color={C.textDim}>For</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
          {LENGTHS.map((l) => (
            <Chip key={l.label} label={l.label} active={length === l.days} color={C.carbs} onPress={() => setLength(l.days)} />
          ))}
        </View>
        <Txt variant="caption" color={C.textFaint}>
          {end ? `${prettyDay(start)} → ${prettyDay(end)}` : `${prettyDay(start)} until you resume`}
        </Txt>
      </Card>

      <Card style={{ gap: Space.md }}>
        <Txt variant="caption" color={C.textDim}>Why</Txt>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
          {PAUSE_REASONS.map((r) => (
            <Chip key={r} label={r} active={reason === r} color={C.carbs} onPress={() => setReason(r)} />
          ))}
        </View>
        <Field placeholder="…or in your own words (e.g. knee feels off)" value={reason} onChangeText={setReason} maxLength={120} />
      </Card>

      <Button title="⏸  Pause" color={C.carbs} onPress={save} loading={add.isPending} />
      <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
