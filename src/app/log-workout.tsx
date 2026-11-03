import { router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { dialog } from '@/components/dialog';
import { RankBadge } from '@/components/rank-badge';
import { Button, Card, Chip, Field, IconButton, Loading, Row, Screen, Segmented, SheetHeader, Txt } from '@/components/ui';
import { C, Space } from '@/constants/theme';
import { EXERCISE_CATALOG, KIND_LABEL } from '@/lib/catalog';
import { useCreateExercise, useDeleteWorkout, useProfile, useSaveWorkout, useWorkouts } from '@/lib/data';
import { todayKey } from '@/lib/dates';
import { estimateBurn, estimateRepBurn } from '@/lib/nutrition';
import { rankExercise, type Rank } from '@/lib/tiers';
import type { ExerciseKind, SetPart, WorkoutLog, WorkoutSet } from '@/lib/types';
import { useRankedExercises } from '@/lib/use-ranks';
import { KNEE_FACTOR, nextEasier, partLabel, standardReps, variantById, variantsFor, type Variant } from '@/lib/variants';
import { sound } from '@/lib/sound';

type PartDraft = { reps: string; variant: string; knees: boolean };
type SetDraft = PartDraft & { weight: string; then: PartDraft[] };
const EMPTY_SET: SetDraft = { reps: '', weight: '', variant: 'standard', knees: false, then: [] };

const partDraft = (p: SetPart): PartDraft => ({ reps: String(p.reps), variant: p.variant ?? 'standard', knees: !!p.knees });
const setDraft = (s: WorkoutSet): SetDraft => ({ ...partDraft(s), weight: s.weight ? String(s.weight) : '', then: (s.then ?? []).map(partDraft) });
const numStr = (n: number | null) => (n ? String(n) : '');

export default function LogWorkout() {
  const params = useLocalSearchParams<{ exerciseId?: string; date?: string; id?: string }>();
  const profile = useProfile().data;
  const { ranked } = useRankedExercises();
  const workouts = useWorkouts();
  const existing = workouts.data?.find((w) => w.id === params.id);
  const date = existing?.log_date ?? params.date ?? todayKey();
  const saveWorkout = useSaveWorkout();
  const del = useDeleteWorkout();

  const [exerciseId, setExerciseId] = useState<string | undefined>(params.exerciseId);
  const [creating, setCreating] = useState(false);
  const [sets, setSets] = useState<SetDraft[]>([EMPTY_SET]);
  // Which variation picker is open: "2" for set 3's opening reps, "2.0" for its first follow-on part.
  const [picking, setPicking] = useState<string | null>(null);
  const [duration, setDuration] = useState('');
  const [distance, setDistance] = useState('');
  const [calories, setCalories] = useState('');
  const [notes, setNotes] = useState('');
  const [rankUp, setRankUp] = useState<{ before: Rank; after: Rank; name: string } | null>(null);

  // Editing a saved session: prefill once it has loaded.
  const [prefilledId, setPrefilledId] = useState<string>();
  if (existing && prefilledId !== existing.id) {
    setPrefilledId(existing.id);
    setExerciseId(existing.exercise_id);
    setSets(existing.sets.length ? existing.sets.map(setDraft) : [EMPTY_SET]);
    setDuration(numStr(existing.duration_min));
    setDistance(numStr(existing.distance_km));
    setCalories(numStr(existing.calories_burned));
    setNotes(existing.notes ?? '');
  }

  const current = ranked.find((r) => r.exercise.id === exerciseId);
  const kind = current?.exercise.kind;
  const variants = current ? variantsFor(current.exercise) : null;

  const updateSet = (i: number, patch: Partial<SetDraft>) => setSets(sets.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const updatePart = (i: number, j: number, patch: Partial<PartDraft>) =>
    updateSet(i, { then: sets[i].then.map((p, k) => (k === j ? { ...p, ...patch } : p)) });
  // Follow-on reps default to what you'd usually drop to (diamond → knee diamond); any variation can be picked.
  function addPart(i: number) {
    if (!variants) return;
    const next = nextEasier(variants, sets[i].then.at(-1) ?? sets[i]);
    updateSet(i, { then: [...sets[i].then, { reps: '', variant: next.variant ?? 'standard', knees: !!next.knees }] });
  }

  // The sets as they'll be saved: empty parts dropped, variations only where the exercise has them.
  function cleanSets(): WorkoutSet[] {
    if (kind === 'cardio') return [];
    return sets
      .filter((s) => Number(s.reps) > 0)
      .map((s): WorkoutSet => {
        if (kind === 'strength') return { reps: Number(s.reps), weight: Number(s.weight) || 0 };
        if (!variants) return { reps: Number(s.reps) };
        const part = (p: PartDraft) => ({ reps: Number(p.reps), variant: p.variant, ...(p.knees ? { knees: true } : null) });
        const then = s.then.filter((p) => Number(p.reps) > 0).map(part);
        return { ...part(s), ...(then.length ? { then } : null) };
      });
  }

  // Bodyweight moves estimate from your reps; everything else from how long you trained.
  function estimate() {
    if (!current) return;
    const weightKg = profile?.weight_kg || 75;
    if (kind === 'bodyweight') {
      const reps = cleanSets().reduce((sum, s) => sum + standardReps(s), 0);
      if (!reps) return dialog('Add your sets', 'The estimate is based on your reps.');
      return setCalories(String(estimateRepBurn(current.exercise.name, reps, weightKg)));
    }
    const mins = Number(duration);
    if (!mins) return dialog('Add a duration', 'The estimate is based on how long you trained.');
    setCalories(String(estimateBurn(current.exercise.name, current.exercise.kind, mins, weightKg)));
  }

  async function save() {
    if (!current) return dialog('Pick an exercise');
    const saved = cleanSets();
    if (kind !== 'cardio' && saved.length === 0) return dialog('Add at least one set');
    if (kind === 'cardio' && !Number(duration) && !Number(distance)) return dialog('Add a duration or distance');

    const log = {
      exercise_id: current.exercise.id,
      log_date: date,
      sets: saved,
      duration_min: Number(duration) || null,
      distance_km: Number(distance) || null,
      calories_burned: Math.max(0, Math.round(Number(calories) || 0)),
      notes: notes.trim() || null,
    };

    try {
      await saveWorkout.mutateAsync({ id: existing?.id, ...log });
    } catch (e) {
      return dialog('Could not save', (e as Error).message);
    }

    const before = current.rank;
    const others = current.logs.filter((w) => w.id !== existing?.id);
    const after = rankExercise(current.exercise, [...others, { ...log, id: existing?.id ?? 'new', created_at: '' } as WorkoutLog], profile?.weight_kg ?? null);
    const firstEver = !existing && current.logs.length === 0;
    if (after.score > before.score || firstEver) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (after.score > before.score) sound.rankUp();
      else sound.success();
      setRankUp({ before, after, name: current.exercise.name });
    } else {
      sound.success();
      router.back();
    }
  }

  function remove() {
    if (!existing) return;
    dialog('Delete this session?', current?.exercise.name, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => del.mutate(existing.id, { onSuccess: () => (sound.remove(), router.back()) }) },
    ]);
  }

  if (params.id && !existing) {
    return workouts.isPending ? <Loading /> : (
      <Screen>
        <SheetHeader title="Edit workout" />
        <Txt color={C.textDim}>This session no longer exists.</Txt>
      </Screen>
    );
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
      <SheetHeader title={existing ? 'Edit workout' : 'Log workout'} />

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
                <View key={i} style={{ gap: Space.xs }}>
                  <Row gap={Space.sm}>
                    <Txt color={C.textDim} style={{ width: 44 }}>{`Set ${i + 1}`}</Txt>
                    <Field
                      style={{ flex: 1 }}
                      placeholder={/split squat|lunge/i.test(current.exercise.name) ? 'reps/leg' : 'reps'}
                      keyboardType="number-pad"
                      value={s.reps}
                      onChangeText={(v) => updateSet(i, { reps: v })}
                    />
                    {kind === 'strength' ? (
                      <Field
                        style={{ flex: 1 }}
                        placeholder="kg"
                        suffix="kg"
                        keyboardType="decimal-pad"
                        value={s.weight}
                        onChangeText={(v) => updateSet(i, { weight: v })}
                      />
                    ) : null}
                    {variants ? <VariantButton choice={s} open={picking === `${i}`} onPress={() => setPicking(picking === `${i}` ? null : `${i}`)} /> : null}
                    {sets.length > 1 ? <IconButton icon="minus" onPress={() => setSets(sets.filter((_, j) => j !== i))} /> : null}
                  </Row>
                  {variants && picking === `${i}` ? (
                    <VariantPicker variants={variants} value={s} onChange={(c, done) => { updateSet(i, c); if (done) setPicking(null); }} />
                  ) : null}

                  {s.then.map((p, j) => (
                    <View key={j} style={{ gap: Space.xs }}>
                      <Row gap={Space.sm}>
                        <Txt color={C.textDim} style={{ width: 44 }}>then</Txt>
                        <Field style={{ flex: 1 }} placeholder="reps" keyboardType="number-pad" value={p.reps} onChangeText={(v) => updatePart(i, j, { reps: v })} />
                        {variants ? (
                          <VariantButton choice={p} open={picking === `${i}.${j}`} onPress={() => setPicking(picking === `${i}.${j}` ? null : `${i}.${j}`)} />
                        ) : null}
                        <IconButton icon="minus" onPress={() => updateSet(i, { then: s.then.filter((_, k) => k !== j) })} />
                      </Row>
                      {variants && picking === `${i}.${j}` ? (
                        <VariantPicker variants={variants} value={p} onChange={(c, done) => { updatePart(i, j, c); if (done) setPicking(null); }} />
                      ) : null}
                    </View>
                  ))}
                  {variants ? (
                    <Txt variant="caption" color={C.textDim} style={{ marginLeft: 44 + Space.sm }} onPress={() => addPart(i)}>
                      + then (switch variation mid-set)
                    </Txt>
                  ) : null}
                </View>
              ))}
              <Button
                title="+ Add set"
                variant="secondary"
                onPress={() => {
                  const last = sets.at(-1) ?? EMPTY_SET;
                  setSets([...sets, { ...last, then: last.then.map((p) => ({ ...p })) }]);
                }}
              />
              {variants ? (
                <Txt variant="caption" color={C.textFaint}>
                  Variations count by difficulty in standard reps (diamond ×1.3, archer ×2.5, one-arm ×6); doing one on your knees halves it. Your rank uses your best set.
                </Txt>
              ) : null}
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
            {kind === 'bodyweight'
              ? 'Type in what your watch says, or estimate from your sets and bodyweight. Burned calories are added to your daily budget.'
              : 'Type in what your watch says, or estimate from duration. Burned calories are added to your daily budget.'}
          </Txt>

          <Field label="Notes" placeholder="How did it feel?" value={notes} onChangeText={setNotes} />
          <Button title="Save" color={C.burn} onPress={save} loading={saveWorkout.isPending} />
          {existing ? <Button title="Delete" variant="danger" onPress={remove} loading={del.isPending} /> : null}
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

type Choice = { variant: string; knees: boolean };

function VariantButton({ choice, open, onPress }: { choice: Choice; open: boolean; onPress: () => void }) {
  return <Chip label={`${partLabel(choice)} ▾`} active={open} color={C.burn} onPress={onPress} />;
}

/** Variation chips plus an "on knees" toggle; `done` is true once a variation is picked (the toggle keeps it open). */
function VariantPicker({ variants, value, onChange }: { variants: Variant[]; value: Choice; onChange: (c: Choice, done: boolean) => void }) {
  const kneeable = !!variantById(value.variant)?.knees;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm, paddingLeft: 44 + Space.sm }}>
      {kneeable ? (
        <Chip label={`On knees ×${KNEE_FACTOR}`} active={value.knees} onPress={() => onChange({ ...value, knees: !value.knees }, false)} />
      ) : null}
      {variants.map((v) => (
        <Chip
          key={v.id}
          label={`${v.name} ×${v.factor}`}
          active={v.id === value.variant}
          color={C.burn}
          onPress={() => onChange({ variant: v.id, knees: value.knees && !!v.knees }, true)}
        />
      ))}
    </View>
  );
}
