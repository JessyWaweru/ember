import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { dialog } from '@/components/dialog';
import { RankBadge } from '@/components/rank-badge';
import { Bar, Button, Card, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { KIND_LABEL } from '@/lib/catalog';
import { useDeleteWorkout } from '@/lib/data';
import { prettyDay } from '@/lib/dates';
import { TIERS } from '@/lib/tiers';
import { useRankedExercises } from '@/lib/use-ranks';
import { describeWorkout } from '@/lib/workout-format';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ranked, isPending } = useRankedExercises();
  const del = useDeleteWorkout();
  const item = ranked.find((r) => r.exercise.id === id);

  if (isPending) return <Loading />;
  if (!item) return <Screen><Txt>Exercise not found.</Txt></Screen>;
  const { exercise, rank, logs } = item;

  return (
    <Screen style={{ paddingTop: 100 }}>
      <View style={{ alignItems: 'center', gap: Space.sm }}>
        <RankBadge tier={rank.tier} division={logs.length ? rank.division : null} size={110} />
        <Txt variant="title" style={{ marginTop: Space.md }}>{exercise.name}</Txt>
        <Txt color={logs.length ? rank.tier.color : C.textDim} style={{ fontWeight: '700' }}>
          {logs.length ? rank.title : 'Unranked'} · {KIND_LABEL[exercise.kind]}
        </Txt>
      </View>

      <Card style={{ gap: Space.sm }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <Txt color={C.textDim}>{rank.metricLabel}</Txt>
          <Txt style={{ fontWeight: '700' }}>{rank.current}</Txt>
        </Row>
        <Bar progress={logs.length ? rank.progress : 0} color={rank.tier.color} />
        <Txt variant="caption" color={C.textDim}>
          {rank.next ? `Reach ${rank.next} for the next division` : 'Top of the ladder. Legendary.'}
        </Txt>
      </Card>

      <Button title="Log this exercise" color={C.burn} onPress={() => router.push({ pathname: '/log-workout', params: { exerciseId: exercise.id } })} />

      <SectionHeader title="Rank ladder" />
      <Row style={{ justifyContent: 'space-between' }}>
        {TIERS.map((t, i) => (
          <View key={t.name} style={{ alignItems: 'center', gap: 4, opacity: i <= rank.tierIndex && logs.length ? 1 : 0.3 }}>
            <RankBadge tier={t} size={26} />
            <Txt style={{ fontSize: 9, color: C.textDim }}>{t.name}</Txt>
          </View>
        ))}
      </Row>

      <SectionHeader title={`History (${logs.length})`} />
      {logs.map((w) => (
        <Card
          key={w.id}
          style={{ padding: Space.md }}
          onPress={() =>
            dialog('Delete this session?', `${prettyDay(w.log_date)} · ${describeWorkout(exercise.kind, w)}`, [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Delete', style: 'destructive', onPress: () => del.mutate(w.id) },
            ])
          }>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Txt style={{ fontWeight: '600' }}>{describeWorkout(exercise.kind, w)}</Txt>
              <Txt variant="caption" color={C.textDim}>{prettyDay(w.log_date)}{w.notes ? ` · ${w.notes}` : ''}</Txt>
            </View>
            <Txt color={C.burn} style={{ fontWeight: '700' }}>{`${w.calories_burned} kcal`}</Txt>
          </Row>
        </Card>
      ))}
      {logs.length ? <Txt variant="caption" color={C.textFaint}>Tap a session to delete it.</Txt> : null}
    </Screen>
  );
}
