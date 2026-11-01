import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { dialog } from '@/components/dialog';
import { RankBadge } from '@/components/rank-badge';
import { RankHistoryChart } from '@/components/rank-history-chart';
import { Bar, Button, Card, Loading, Row, Screen, SectionHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { KIND_LABEL } from '@/lib/catalog';
import { useDeleteWorkout, useProfile } from '@/lib/data';
import { prettyDay } from '@/lib/dates';
import { rankHistory, TIERS, type SessionRank } from '@/lib/tiers';
import { useRankedExercises } from '@/lib/use-ranks';
import { describeWorkout } from '@/lib/workout-format';
import { sound } from '@/lib/sound';

export default function ExerciseDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { ranked, isPending } = useRankedExercises();
  const del = useDeleteWorkout();
  const bodyweight = useProfile().data?.weight_kg ?? null;
  const item = ranked.find((r) => r.exercise.id === id);

  if (isPending) return <Loading />;
  if (!item) return <Screen back><Txt>Exercise not found.</Txt></Screen>;
  const { exercise, rank, logs } = item;

  const history = rankHistory(exercise, logs, bodyweight);
  const ownRank = new Map(history.map((h) => [h.log.id, h.own]));
  // Best and lowest single sessions; only worth showing once they differ.
  const byValue = [...history].sort((a, b) => b.own.value - a.own.value);
  const best = byValue[0];
  const lowest = byValue[byValue.length - 1];
  const showExtremes = history.length >= 2 && best.own.value !== lowest.own.value;

  return (
    <Screen back>
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

      {history.length >= 2 ? (
        <>
          <SectionHeader title="Rank over time" />
          <Card>
            <RankHistoryChart history={history} />
          </Card>
        </>
      ) : null}

      <SectionHeader title={`History (${logs.length})`} />
      {showExtremes ? (
        <Row gap={Space.md}>
          <ExtremeCard label="Best session" session={best} />
          <ExtremeCard label="Lowest session" session={lowest} />
        </Row>
      ) : null}
      {logs.map((w) => {
        const own = ownRank.get(w.id);
        const tag = showExtremes ? (w.id === best.log.id ? 'Best' : w.id === lowest.log.id ? 'Lowest' : null) : null;
        return (
          <Card
            key={w.id}
            style={{ padding: Space.md }}
            onPress={() =>
              dialog('Delete this session?', `${prettyDay(w.log_date)} · ${describeWorkout(exercise.kind, w)}`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: () => del.mutate(w.id, { onSuccess: sound.remove }) },
              ])
            }>
            <Row gap={Space.md}>
              {own ? <RankBadge tier={own.tier} size={22} /> : null}
              <View style={{ flex: 1, gap: 2 }}>
                <Row gap={Space.sm}>
                  <Txt style={{ fontWeight: '600', flexShrink: 1 }} numberOfLines={1}>{describeWorkout(exercise.kind, w)}</Txt>
                  {tag ? <Tag label={tag} /> : null}
                </Row>
                <Txt variant="caption" color={C.textDim}>
                  {own ? `${own.title} · ` : ''}{prettyDay(w.log_date)}{w.notes ? ` · ${w.notes}` : ''}
                </Txt>
              </View>
              <Txt color={C.burn} style={{ fontWeight: '700' }}>{`${w.calories_burned} kcal`}</Txt>
            </Row>
          </Card>
        );
      })}
      {logs.length ? <Txt variant="caption" color={C.textFaint}>Tap a session to delete it.</Txt> : null}
    </Screen>
  );
}

function ExtremeCard({ label, session }: { label: string; session: SessionRank }) {
  return (
    <Card style={{ flex: 1, gap: Space.sm, padding: Space.md }}>
      <Txt variant="caption" color={C.textDim}>{label}</Txt>
      <Row gap={Space.sm}>
        <RankBadge tier={session.own.tier} size={26} />
        <View style={{ flex: 1 }}>
          <Txt style={{ fontWeight: '700' }} numberOfLines={1}>{session.own.title}</Txt>
          <Txt variant="caption" color={C.textDim} numberOfLines={1}>{session.own.current}</Txt>
        </View>
      </Row>
      <Txt variant="caption" color={C.textFaint}>{prettyDay(session.log.log_date)}</Txt>
    </Card>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <View style={{ backgroundColor: C.cardHigh, borderRadius: 6, paddingHorizontal: 6, paddingVertical: 1 }}>
      <Txt variant="caption" style={{ fontWeight: '700' }}>{label}</Txt>
    </View>
  );
}
