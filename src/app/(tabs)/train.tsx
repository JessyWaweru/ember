import { router } from 'expo-router';
import { useEffect, useRef } from 'react';
import { View } from 'react-native';

import { RankBadge } from '@/components/rank-badge';
import { Bar, Button, Card, PageHeader, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { STARTER_EXERCISES } from '@/lib/catalog';
import { useCreateExercise, useExercises } from '@/lib/data';
import { addDays, fromDateKey, prettyDay, todayKey } from '@/lib/dates';
import { overallRank } from '@/lib/tiers';
import { useRankedExercises } from '@/lib/use-ranks';
import { describeWorkout } from '@/lib/workout-format';

/** Creates your routine's exercises the first time you open Train. */
function useSeedStarterExercises() {
  const { data: exercises } = useExercises();
  const create = useCreateExercise();
  const seeded = useRef(false);
  useEffect(() => {
    if (!exercises || exercises.length > 0 || seeded.current) return;
    seeded.current = true;
    STARTER_EXERCISES.forEach((ex) => create.mutate(ex));
  }, [exercises, create]);
}

export default function Train() {
  useSeedStarterExercises();
  const { ranked, workouts } = useRankedExercises();
  const today = todayKey();
  const weekStart = addDays(today, -fromDateKey(today).getDay());
  const week = workouts.filter((w) => w.log_date >= weekStart);
  const trained = ranked.filter((r) => r.logs.length > 0);
  const overall = overallRank(trained.map((r) => r.rank));
  const nameOf = new Map(ranked.map((r) => [r.exercise.id, r.exercise]));

  // Most-trained first, so your routine floats to the top.
  const sorted = [...ranked].sort((a, b) => b.logs.length - a.logs.length || a.exercise.name.localeCompare(b.exercise.name));

  return (
    <Screen tabs>
      <PageHeader kicker="RANK UP" title="Train" tagline="Log the work. Climb the ladder." color={C.burn} />

      <Card style={{ flexDirection: 'row', alignItems: 'center', gap: Space.xl, padding: Space.xl }}>
        <RankBadge tier={overall.tier} size={72} />
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="caption" color={C.textDim}>Athlete rank</Txt>
          <Txt variant="title" color={overall.tier.color}>{overall.title}</Txt>
          <Txt variant="caption" color={C.textDim}>
            {`${week.length} sessions · ${week.reduce((s, w) => s + w.calories_burned, 0)} kcal this week`}
          </Txt>
        </View>
      </Card>

      <Button title="Log workout" color={C.burn} onPress={() => router.push('/log-workout')} />

      <SectionHeader title="Your ranks" />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: Space.md }}>
        {sorted.map(({ exercise, rank, logs }) => (
          <Card
            key={exercise.id}
            onPress={() => router.push({ pathname: '/exercise/[id]', params: { id: exercise.id } })}
            style={{ width: '48.5%', gap: Space.sm, alignItems: 'center' }}>
            <RankBadge tier={rank.tier} division={logs.length ? rank.division : null} size={48} />
            <Txt numberOfLines={2} style={{ fontWeight: '700', marginTop: Space.xs, textAlign: 'center', minHeight: 40 }}>{exercise.name}</Txt>
            <Txt variant="caption" color={logs.length ? rank.tier.color : C.textFaint} style={{ fontWeight: '700' }}>
              {logs.length ? rank.title : 'Unranked'}
            </Txt>
            <View style={{ alignSelf: 'stretch' }}>
              <Bar progress={logs.length ? rank.progress : 0} color={rank.tier.color} height={6} />
            </View>
            <Txt variant="caption" color={C.textDim} style={{ fontSize: 11 }}>
              {logs.length ? (rank.next ? `${rank.current} → ${rank.next}` : rank.current) : 'Log it to get ranked'}
            </Txt>
          </Card>
        ))}
      </View>

      <SectionHeader title="Recent sessions" />
      {workouts.length === 0 ? <Txt color={C.textDim}>Nothing logged yet — your first session gets you ranked.</Txt> : null}
      {workouts.slice(0, 15).map((w) => {
        const ex = nameOf.get(w.exercise_id);
        return (
          <Card key={w.id} style={{ padding: Space.md }} onPress={() => ex && router.push({ pathname: '/exercise/[id]', params: { id: ex.id } })}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Txt style={{ fontWeight: '700' }}>{ex?.name ?? 'Exercise'}</Txt>
                <Txt variant="caption" color={C.textDim}>{`${prettyDay(w.log_date)} · ${ex ? describeWorkout(ex.kind, w) : ''}`}</Txt>
              </View>
              <Txt color={C.burn} style={{ fontWeight: '700' }}>{`${w.calories_burned} kcal`}</Txt>
            </Row>
          </Card>
        );
      })}
    </Screen>
  );
}
