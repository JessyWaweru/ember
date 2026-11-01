import { View } from 'react-native';

import { dialog } from '@/components/dialog';
import { C, Space } from '@/constants/theme';
import { useEndPause } from '@/lib/data';
import { prettyDay, todayKey } from '@/lib/dates';
import type { Habit, HabitPause } from '@/lib/types';
import { sound } from '@/lib/sound';

import { Button, Card, Row, Txt } from './ui';

/** "Today → Fri, Nov 7", "From tomorrow · until you resume", … */
export function pauseSpan(p: HabitPause) {
  const from = p.start_date <= todayKey() ? (p.start_date === todayKey() ? 'Today' : `Since ${prettyDay(p.start_date)}`) : `From ${prettyDay(p.start_date)}`;
  return p.end_date ? (p.end_date === p.start_date ? from : `${from} → ${prettyDay(p.end_date)}`) : `${from} · until you resume`;
}

export function pauseTarget(p: HabitPause, habits: Habit[]) {
  if (p.habit_id === null) return 'All habits';
  const h = habits.find((x) => x.id === p.habit_id);
  return h ? `${h.emoji} ${h.name}` : 'A deleted habit';
}

/** Running and upcoming pauses, each with its reason and a Resume button. */
export function PauseBanner({ pauses, habits }: { pauses: HabitPause[]; habits: Habit[] }) {
  const end = useEndPause();
  if (pauses.length === 0) return null;
  return (
    <Card style={{ gap: Space.md, borderWidth: 1, borderColor: C.carbs + '55' }}>
      <Txt variant="caption" color={C.carbs} style={{ fontWeight: '800', letterSpacing: 2 }}>⏸  PAUSED</Txt>
      {pauses.map((p) => (
        <Row key={p.id} gap={Space.md}>
          <View style={{ flex: 1, gap: 2 }}>
            <Txt style={{ fontWeight: '700' }} numberOfLines={1}>{pauseTarget(p, habits)}</Txt>
            <Txt variant="caption" color={C.text}>{`“${p.reason}”`}</Txt>
            <Txt variant="caption" color={C.textDim}>{pauseSpan(p)}</Txt>
          </View>
          <Button
            title="Resume"
            variant="secondary"
            onPress={() =>
              dialog('Resume now?', `${pauseTarget(p, habits)} count again from today.`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Resume', onPress: () => end.mutate(p, { onSuccess: sound.success }) },
              ])
            }
          />
        </Row>
      ))}
    </Card>
  );
}
