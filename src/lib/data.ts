import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { useAuth } from './auth';
import { addDays, todayKey } from './dates';
import { supabase } from './supabase';
import type {
  Exercise,
  ExerciseKind,
  Habit,
  HabitLog,
  HabitLogStatus,
  HabitPause,
  Meal,
  NewHabit,
  NewHabitPause,
  NewMeal,
  NewWorkoutLog,
  Profile,
  WeightLog,
  WorkoutLog,
} from './types';

async function unwrap<T>(p: PromiseLike<{ data: T | null; error: { message: string } | null }>): Promise<T> {
  const { data, error } = await p;
  if (error) throw new Error(error.message);
  return data as T;
}

const useUid = () => {
  // Every hook below is only used inside the signed-in part of the app.
  const { session } = useAuth();
  return session!.user.id;
};

// ───────────── profile ─────────────

export function useProfile() {
  const id = useUid();
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => unwrap<Profile>(supabase.from('profiles').select('*').eq('id', id).single()),
  });
}

export function useUpdateProfile() {
  const id = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<Profile>) =>
      unwrap(supabase.from('profiles').update(patch).eq('id', id).select().single()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile'] }),
  });
}

// ───────────── meals ─────────────

export function useMeals(date: string) {
  return useQuery({
    queryKey: ['meals', date],
    queryFn: () =>
      unwrap<Meal[]>(supabase.from('meals').select('*').eq('log_date', date).order('created_at')),
  });
}

/** Meals between two dates (inclusive), for history and charts. */
export function useMealsRange(start: string, end: string) {
  return useQuery({
    queryKey: ['meals', 'range', start, end],
    queryFn: () =>
      unwrap<Meal[]>(
        supabase.from('meals').select('*').gte('log_date', start).lte('log_date', end).order('created_at')
      ),
  });
}

/** Distinct recently logged foods, for one-tap re-logging. */
export function useRecentFoods() {
  return useQuery({
    queryKey: ['meals', 'recent'],
    queryFn: async () => {
      const rows = await unwrap<Meal[]>(
        supabase.from('meals').select('*').order('created_at', { ascending: false }).limit(200)
      );
      const seen = new Set<string>();
      return rows.filter((m) => {
        const key = m.name.trim().toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, 30);
    },
  });
}

export function useSaveMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...meal }: NewMeal & { id?: string }) =>
      id
        ? unwrap(supabase.from('meals').update(meal).eq('id', id))
        : unwrap(supabase.from('meals').insert(meal)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });
}

export function useDeleteMeal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('meals').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['meals'] }),
  });
}

// ───────────── weight ─────────────

export function useWeights() {
  return useQuery({
    queryKey: ['weights'],
    queryFn: () => unwrap<WeightLog[]>(supabase.from('weight_logs').select('*').order('log_date')),
  });
}

export function useLogWeight() {
  const id = useUid();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (weight_kg: number) => {
      await unwrap(
        supabase.from('weight_logs').upsert({ log_date: todayKey(), weight_kg }, { onConflict: 'user_id,log_date' })
      );
      // Keep the profile's current weight in sync — it drives strength ranks.
      await unwrap(supabase.from('profiles').update({ weight_kg }).eq('id', id));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['weights'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

// ───────────── exercise ─────────────

export function useExercises() {
  return useQuery({
    queryKey: ['exercises'],
    queryFn: () => unwrap<Exercise[]>(supabase.from('exercises').select('*').order('name')),
  });
}

export function useCreateExercise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ex: { name: string; kind: ExerciseKind }) =>
      unwrap<Exercise>(
        supabase.from('exercises').upsert(ex, { onConflict: 'user_id,name' }).select().single()
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['exercises'] }),
  });
}

/** Every workout you've logged. Ranks need the full history; it stays small for one person. */
export function useWorkouts() {
  return useQuery({
    queryKey: ['workouts'],
    queryFn: () =>
      unwrap<WorkoutLog[]>(
        supabase.from('workout_logs').select('*').order('log_date', { ascending: false }).order('created_at', { ascending: false })
      ),
  });
}

export function useAddWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (log: NewWorkoutLog) => unwrap(supabase.from('workout_logs').insert(log)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  });
}

export function useDeleteWorkout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('workout_logs').delete().eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['workouts'] }),
  });
}

// ───────────── habits ─────────────

export function useHabits() {
  return useQuery({
    queryKey: ['habits'],
    queryFn: () =>
      unwrap<Habit[]>(
        supabase.from('habits').select('*').eq('archived', false).order('sort_order').order('created_at')
      ),
  });
}

/** Active and archived habits, for the manage screen. */
export function useAllHabits() {
  return useQuery({
    queryKey: ['habits', 'all'],
    queryFn: () => unwrap<Habit[]>(supabase.from('habits').select('*').order('sort_order').order('created_at')),
  });
}

export function useRestoreHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('habits').update({ archived: false }).eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

/** Deletes a habit and its whole history. */
export function useDeleteHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('habits').delete().eq('id', id)),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['habits'] });
      qc.invalidateQueries({ queryKey: ['habit_logs'] });
      qc.invalidateQueries({ queryKey: ['habit_pauses'] });
    },
  });
}

export function useHabitPauses() {
  return useQuery({
    queryKey: ['habit_pauses'],
    queryFn: () => unwrap<HabitPause[]>(supabase.from('habit_pauses').select('*').order('start_date', { ascending: false })),
  });
}

export function useAddPauses() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pauses: NewHabitPause[]) => unwrap(supabase.from('habit_pauses').insert(pauses)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habit_pauses'] }),
  });
}

/** Resume: a pause that hasn't started is removed; a running one ends yesterday, so today counts again. */
export function useEndPause() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pause: HabitPause) => {
      const today = todayKey();
      return pause.start_date >= today
        ? unwrap(supabase.from('habit_pauses').delete().eq('id', pause.id))
        : unwrap(supabase.from('habit_pauses').update({ end_date: addDays(today, -1) }).eq('id', pause.id));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habit_pauses'] }),
  });
}

/** Calories eaten per day since `start`, paged past Supabase's 1000-row limit. Feeds the calorie-cap habit. */
export function useDailyCalories(start: string) {
  return useQuery({
    queryKey: ['meals', 'daily', start],
    queryFn: async () => {
      const totals = new Map<string, number>();
      for (let from = 0; ; from += 1000) {
        const rows = await unwrap<Pick<Meal, 'log_date' | 'calories'>[]>(
          supabase.from('meals').select('log_date, calories').gte('log_date', start).order('log_date').range(from, from + 999)
        );
        for (const r of rows) totals.set(r.log_date, (totals.get(r.log_date) ?? 0) + r.calories);
        if (rows.length < 1000) return totals;
      }
    },
  });
}

/** One year of habit check-ins — enough for the heatmaps and streaks. */
export function useHabitLogs() {
  return useQuery({
    queryKey: ['habit_logs'],
    queryFn: () =>
      unwrap<HabitLog[]>(supabase.from('habit_logs').select('*').gte('log_date', addDays(todayKey(), -400))),
  });
}

export function useSaveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...habit }: NewHabit & { id?: string }) =>
      id
        ? unwrap(supabase.from('habits').update(habit).eq('id', id))
        : unwrap(supabase.from('habits').insert(habit)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

export function useArchiveHabit() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap(supabase.from('habits').update({ archived: true }).eq('id', id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['habits'] }),
  });
}

type HabitLogInput = { habit_id: string; log_date: string } & (
  | { clear: true }
  | { clear?: false; count: number; status: HabitLogStatus }
);

/** Sets (or clears) a habit's log for one day. Optimistic so check-offs feel instant. */
export function useSetHabitLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: HabitLogInput) => {
      const { habit_id, log_date } = input;
      if (input.clear) {
        await unwrap(supabase.from('habit_logs').delete().eq('habit_id', habit_id).eq('log_date', log_date));
      } else {
        await unwrap(
          supabase
            .from('habit_logs')
            .upsert({ habit_id, log_date, count: input.count, status: input.status }, { onConflict: 'habit_id,log_date' })
        );
      }
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: ['habit_logs'] });
      const prev = qc.getQueryData<HabitLog[]>(['habit_logs']);
      qc.setQueryData<HabitLog[]>(['habit_logs'], (old = []) => {
        const rest = old.filter((l) => !(l.habit_id === input.habit_id && l.log_date === input.log_date));
        if (input.clear) return rest;
        const { habit_id, log_date, count, status } = input;
        return [...rest, { id: `tmp-${habit_id}-${log_date}`, habit_id, log_date, count, status }];
      });
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(['habit_logs'], ctx.prev),
    onSettled: () => qc.invalidateQueries({ queryKey: ['habit_logs'] }),
  });
}
