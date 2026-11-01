import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { dialog } from '@/components/dialog';
import { RankBadge } from '@/components/rank-badge';
import { Button, Card, Chip, Field, IconButton, Row, Screen, Segmented, SheetHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { EXERCISE_CATALOG, KIND_LABEL } from '@/lib/catalog';
import { useAddWorkout, useCreateExercise, useProfile } from '@/lib/data';
import { todayKey } from '@/lib/dates';
import { estimateBurn } from '@/lib/nutrition';
import { rankExercise, type Rank } from '@/lib/tiers';
import type { ExerciseKind, WorkoutLog } from '@/lib/types';
import { useRankedExercises } from '@/lib/use-ranks';

type SetDraft = { reps: string; weight: string };

export default function LogWorkout() {
  const params = useLocalSearchParams<{ exerciseId?: string; date?: string }>();
  const date = params.date ?? todayKey();
  const profile = useProfile().data;
  const { ranked } = useRankedExercises();
  const addWorkout = useAddWorkout();

  const [exerciseId, setExerciseId] = useState<string | undefined>(params.exerciseId);
  const [creating, setCreating] = useState(false);
  const [sets, setSets] = useState<SetDraft[]>([{ reps: '', weight: '' }]);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [rankUp, setRankUp] = useState<{ before: Rank; after: Rank; name: string } | null>(null);

  const current = ranked.find((r) => r.exercise.id === exerciseId);
  const kind = current?.exercise.kind;

  function estimate() {
    const mins = Number(duration);
    if (!current || !mins) return dialog('Add a duration', 'The estimate is based on how long you trained.');
    setCalories(String(estimateBurn(current.exercise.name, current.exercise.kind, mins, profile?.weight_kg || 75)));
  }

  async function save() {
    if (!current) return dialog('Pick an exercise');
    const cleanSets = kind === 'cardio'
      ? []
      : sets
          .filter((s) => Number(s.reps) > 0)
          .map((s) => (kind === 'strength' ? { reps: Number(s.reps), weight: Number(s.weight) || 0 } : { reps: Number(s.reps) }));
    if (kind !== 'cardio' && cleanSets.length === 0) return dialog('Add at least one set');
    if (kind === 'cardio' && !Number(duration) && !Number(distance)) return dialog('Add a duration or distance');

    const log = {
      exercise_id: current.exercise.id,
      log_date: date,
      sets: cleanSets,
      duration_min: Number(duration) || null,
      distance_km: Number(distance) || null,
      calories_burned: Math.max(0, Math.round(Number(calories) || 0)),
      notes: notes.trim() || null,
    };

    try {
      await addWorkout.mutateAsync(log);
    } catch (e) {
      return dialog('Could not save', (e as Error).message);
    }

    const before = current.rank;
    const after = rankExercise(current.exercise, [...current.logs, { ...log, id: 'new', created_at: '' } as WorkoutLog], profile?.weight_kg ?? null);
    const firstEver = current.logs.length === 0;
    if (after.score > before.score || firstEver) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setRankUp({ before, after, name: current.exercise.name });
    } else {
      router.back();
    }
  }

  if (rankUp) {
    return (
      <Screen scroll={false} style={{ alignItems: 'center', justifyContent: 'center', gap: Space.xl }}>
        <Txt variant="caption" color={C.textDim} style={{ letterSpacing: 2, fontWeight: '700' }}>
          {rankUp.before.score === rankUp.after.score ? 'RANKED' : 'RANK UP'}
        </Txt>
        <RankBadge tier={rankUp.after.tier} division={rankUp.after.division} size={140} />
        <View style={{ alignItems: 'center', gap: Space.xs }}>
          <Txt variant="title" color={rankUp.after.tier.color}>{rankUp.after.title}</Txt>
          <Txt variant="heading">{rankUp.name}</Txt>
          <Txt color={C.textDim}>{`${rankUp.after.metricLabel}: ${rankUp.after.current}`}</Txt>
          {rankUp.after.next ? <Txt color={C.textDim}>{`Next division at ${rankUp.after.next}`}</Txt> : null}
        </View>
        <Button title="Let's go" color={rankUp.after.tier.color} onPress={() => router.back()} style={{ alignSelf: 'stretch' }} />
      </Screen>
    );
  }

  return (
    <Screen>
      <SheetHeader title="Log workout" />

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
        {ranked.map((r) => (
          <Chip key={r.exercise.id} label={r.exercise.name} active={r.exercise.id === exerciseId} color={C.burn} onPress={() => setExerciseId(r.exercise.id)} />
        ))}
        <Chip label="+ New" onPress={() => setCreating((v) => !v)} active={creating} color={C.cardHigh} />
      </View>

      {creating ? (
        <NewExercise
          existing={new Set(ranked.map((r) => r.exercise.name.toLowerCase()))}
          onCreated={(id) => {
            setExerciseId(id);
            setCreating(false);
          }}
        />
      ) : null}

      {current ? (
        <Card style={{ gap: Space.md }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Txt variant="heading">{current.exercise.name}</Txt>
            <Txt variant="caption" color={current.rank.tier.color} style={{ fontWeight: '700' }}>
              {current.logs.length ? current.rank.title : 'Unranked'}
            </Txt>
          </Row>

          {kind !== 'cardio' ? (
            <View style={{ gap: Space.sm }}>
              {sets.map((s, i) => (
                <Row key={i} gap={Space.sm}>
                  <Txt color={C.textDim} style={{ width: 44 }}>{`Set ${i + 1}`}</Txt>
                  <Field
                    style={{ flex: 1 }}
                    placeholder={/split squat|lunge/i.test(current.exercise.name) ? 'reps/leg' : 'reps'}
                    keyboardType="number-pad"
                    value={s.reps}
                    onChangeText={(v) => setSets(sets.map((x, j) => (j === i ? { ...x, reps: v } : x)))}
                  />
                  {kind === 'strength' ? (
                    <Field
                      style={{ flex: 1 }}
                      placeholder="kg"
                      suffix="kg"
                      keyboardType="decimal-pad"
                      value={s.weight}
                      onChangeText={(v) => setSets(sets.map((x, j) => (j === i ? { ...x, weight: v } : x)))}
                    />
                  ) : null}
                  {sets.length > 1 ? <IconButton icon="minus" onPress={() => setSets(sets.filter((_, j) => j !== i))} /> : null}
                </Row>
              ))}
              <Button
                title="+ Add set"
                variant="secondary"
                onPress={() => setSets([...sets, { ...(sets[sets.length - 1] ?? { reps: '', weight: '' }) }])}
              />
            </View>
          ) : null}

          <Row gap={Space.md}>
            <Field style={{ flex: 1 }} label={kind === 'cardio' ? 'Duration' : 'Duration (optional)'} suffix="min" keyboardType="decimal-pad" value={duration} onChangeText={setDuration} />
            {kind === 'cardio' ? (
              <Field style={{ flex: 1 }} label="Distance (optional)" suffix="km" keyboardType="decimal-pad" value={distance} onChangeText={setDistance} />
            ) : null}
          </Row>

          <Row gap={Space.sm} style={{ alignItems: 'flex-end' }}>
            <Field style={{ flex: 1 }} label="Calories burned" suffix="kcal" keyboardType="number-pad" value={calories} onChangeText={setCalories} placeholder="0" />
            <Button title="Estimate" variant="secondary" onPress={estimate} style={{ height: 48 }} />
          </Row>
          <Txt variant="caption" color={C.textFaint}>
            Type in what your watch says, or estimate from duration. Burned calories are added to your daily budget.
          </Txt>

          <Field label="Notes" placeholder="How did it feel?" value={notes} onChangeText={setNotes} />
          <Button title="Save" color={C.burn} onPress={save} loading={addWorkout.isPending} />
          <Button title="Cancel" variant="ghost" onPress={() => router.back()} />
        </Card>
      ) : (
        <Txt color={C.textDim}>Pick an exercise above.</Txt>
      )}
    </Screen>
  );
}

function NewExercise({ existing, onCreated }: { existing: Set<string>; onCreated: (id: string) => void }) {
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ExerciseKind>('bodyweight');
  const create = useCreateExercise();
  const suggestions = EXERCISE_CATALOG.filter((e) => !existing.has(e.name.toLowerCase()));

  async function make(ex: { name: string; kind: ExerciseKind }) {
    if (!ex.name.trim()) return;
    try {
      const created = await create.mutateAsync({ name: ex.name.trim(), kind: ex.kind });
      onCreated(created.id);
    } catch (e) {
      dialog('Could not create exercise', (e as Error).message);
    }
  }

  return (
    <Card style={{ gap: Space.md }}>
      <Txt variant="heading">New exercise</Txt>
      <Field placeholder="Name" value={name} onChangeText={setName} />
      <Segmented
        value={kind}
        onChange={setKind}
        color={C.burn}
        options={(Object.keys(KIND_LABEL) as ExerciseKind[]).map((k) => ({ value: k, label: KIND_LABEL[k] }))}
      />
      <Txt variant="caption" color={C.textFaint}>
        Weights rank on est. 1-rep max vs bodyweight · Bodyweight on best set, scaled by your bodyweight · Cardio on distance or longest session.
      </Txt>
      <Button title="Create" color={C.burn} onPress={() => make({ name, kind })} loading={create.isPending} disabled={!name.trim()} />
      {suggestions.length ? (
        <>
          <Txt variant="caption" color={C.textDim}>Or pick one:</Txt>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm }}>
            {suggestions.map((s) => <Chip key={s.name} label={s.name} onPress={() => make(s)} />)}
          </View>
        </>
      ) : null}
    </Card>
  );
}
