import { useMemo } from 'react';

import { useDailyCalories, useExercises, useHabitLogs, useHabitPauses, useHabits, useProfile, useWorkouts } from './data';
import { addDays, todayKey } from './dates';
import { effectiveLogs, type AutoInputs } from './habits';
import type { HabitPause } from './types';

/**
 * Habits with their effective logs: your check-ins, auto habits filled in from meals and workouts, and paused days.
 * Every habit screen (and the widget) reads through this so they agree.
 */
export function useHabitData() {
  const habits = useHabits();
  const logs = useHabitLogs();
  // Before the pauses table exists (update 001 not run yet) this errors; habits still work without pauses.
  const pauses = useHabitPauses();
  const hasAuto = !!habits.data?.some((h) => h.auto);

  const profile = useProfile().data;
  const exercises = useExercises().data;
  const workouts = useWorkouts().data;
  const eaten = useDailyCalories(addDays(todayKey(), -400)).data;

  const auto = useMemo<AutoInputs | null>(() => {
    if (!hasAuto || !profile || !exercises || !workouts || !eaten) return null;
    const kind = new Map(exercises.map((e) => [e.id, e.kind]));
    const burned = new Map<string, number>();
    const cardioDays = new Set<string>();
    const strengthDays = new Set<string>();
    for (const w of workouts) {
      burned.set(w.log_date, (burned.get(w.log_date) ?? 0) + w.calories_burned);
      (kind.get(w.exercise_id) === 'cardio' ? cardioDays : strengthDays).add(w.log_date);
    }
    return { eaten, burned, cardioDays, strengthDays, calorieGoal: profile.calorie_goal };
  }, [hasAuto, profile, exercises, workouts, eaten]);

  const pauseList: HabitPause[] = useMemo(() => pauses.data ?? [], [pauses.data]);
  const effective = useMemo(
    () => (habits.data && logs.data ? effectiveLogs(habits.data, logs.data, pauseList, auto) : []),
    [habits.data, logs.data, pauseList, auto]
  );

  return {
    habits: habits.data ?? [],
    logs: effective,
    pauses: pauseList,
    /** false until update 001 has been run in Supabase */
    pausesReady: !pauses.isError,
    isPending: habits.isPending || logs.isPending,
  };
}
