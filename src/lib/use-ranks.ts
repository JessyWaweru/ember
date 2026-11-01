import { useMemo } from 'react';

import { useExercises, useProfile, useWorkouts } from './data';
import { rankExercise, type Rank } from './tiers';
import type { Exercise, WorkoutLog } from './types';

export type RankedExercise = { exercise: Exercise; logs: WorkoutLog[]; rank: Rank };

/** Every exercise with its logs and current rank (unlogged exercises get a Rookie rank). */
export function useRankedExercises() {
  const profile = useProfile().data;
  const exercises = useExercises();
  const workouts = useWorkouts();

  const ranked = useMemo<RankedExercise[]>(() => {
    if (!exercises.data || !workouts.data) return [];
    return exercises.data.map((exercise) => {
      const logs = workouts.data.filter((w) => w.exercise_id === exercise.id);
      return { exercise, logs, rank: rankExercise(exercise, logs, profile?.weight_kg ?? null) };
    });
  }, [exercises.data, workouts.data, profile?.weight_kg]);

  return { ranked, isPending: exercises.isPending || workouts.isPending, workouts: workouts.data ?? [] };
}
