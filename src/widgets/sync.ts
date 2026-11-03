import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';

import { useDailyCalories, useExercises, useMeals, useProfile, useWorkouts } from '@/lib/data';
import { addDays, fromDateKey, todayKey } from '@/lib/dates';
import { dayStatus, habitStats, isScheduled, logsByDate } from '@/lib/habits';
import { goalFor, rolledCarry } from '@/lib/nutrition';
import { overallRank, rankExercise } from '@/lib/tiers';
import { useHabitData } from '@/lib/use-habit-data';

import CaloriesWidget from './CaloriesWidget';
import ExerciseWidget from './ExerciseWidget';
import HabitsWidget from './HabitsWidget';
import type { CaloriesWidgetProps, ExerciseWidgetProps, HabitsWidgetProps } from './types';

type AnyWidget<P> = {
  updateSnapshot: (p: P) => void;
  updateTimeline: (entries: { date: Date; props: P }[]) => void;
};

/** Show `props` now and (on iOS) `atMidnight` once the day rolls over. */
function push<P extends object>(widget: AnyWidget<P>, props: P, atMidnight: P) {
  try {
    if (Platform.OS === 'ios') {
      const midnight = fromDateKey(addDays(todayKey(), 1));
      widget.updateTimeline([
        { date: new Date(), props },
        { date: midnight, props: atMidnight },
      ]);
    } else {
      widget.updateSnapshot(props);
    }
  } catch (e) {
    // No widget support in this build (e.g. Expo Go or web) — nothing to update.
    if (__DEV__) console.warn('Widget update skipped:', e);
  }
}

/** Keeps the three home-screen widgets in sync with today's data. Mount once, inside the signed-in app. */
export function useWidgetSync() {
  const today = todayKey();
  const profile = useProfile().data;
  const meals = useMeals(today).data;
  const dailyEaten = useDailyCalories(addDays(today, -400)).data;
  const workouts = useWorkouts().data;
  const exercises = useExercises().data;
  // Same view of habits as the app: auto habits filled in, paused days skipped.
  const habitData = useHabitData();
  const habits = habitData.isPending ? undefined : habitData.habits;
  const habitLogs = habitData.isPending ? undefined : habitData.logs;

  const burnedToday = useMemo(
    () => (workouts ?? []).filter((w) => w.log_date === today).reduce((s, w) => s + w.calories_burned, 0),
    [workouts, today]
  );

  useEffect(() => {
    if (!profile || !meals || !dailyEaten) return;
    const sum = (k: 'calories' | 'protein' | 'carbs' | 'fat') => meals.reduce((s, m) => s + m[k], 0);
    const base: CaloriesWidgetProps = {
      eaten: 0, burned: 0, goal: profile.calorie_goal, protein: 0, carbs: 0, fat: 0,
      proteinGoal: profile.protein_goal, carbsGoal: profile.carbs_goal, fatGoal: profile.fat_goal,
    };
    // Today's leftovers (or overshoot) roll into tomorrow's goal, so tomorrow's starts from how today went.
    const eaten = new Map(dailyEaten).set(today, sum('calories'));
    push(
      CaloriesWidget as AnyWidget<CaloriesWidgetProps>,
      {
        ...base,
        goal: goalFor(profile.calorie_goal, rolledCarry(profile.calorie_goal, eaten, today)),
        eaten: sum('calories'), burned: burnedToday, protein: sum('protein'), carbs: sum('carbs'), fat: sum('fat'),
      },
      { ...base, goal: goalFor(profile.calorie_goal, rolledCarry(profile.calorie_goal, eaten, addDays(today, 1))) }
    );
  }, [profile, meals, dailyEaten, burnedToday, today]);

  useEffect(() => {
    if (!profile || !workouts || !exercises) return;
    const ranked = exercises
      .map((ex) => ({ ex, logs: workouts.filter((w) => w.exercise_id === ex.id) }))
      .filter((r) => r.logs.length > 0)
      .map((r) => ({ ex: r.ex, rank: rankExercise(r.ex, r.logs, profile.weight_kg) }));
    const overall = overallRank(ranked.map((r) => r.rank));
    const top = [...ranked].sort((a, b) => b.rank.score - a.rank.score)[0];
    const weekStart = addDays(today, -fromDateKey(today).getDay());

    const base: ExerciseWidgetProps = {
      burnedToday: 0,
      sessionsToday: 0,
      sessionsThisWeek: workouts.filter((w) => w.log_date >= weekStart).length,
      rankTitle: overall.title,
      rankColor: overall.tier.color,
      rankEmoji: overall.tier.emoji,
      topExercise: top ? `${top.ex.name} · ${top.rank.title}` : '',
    };
    push(
      ExerciseWidget as AnyWidget<ExerciseWidgetProps>,
      { ...base, burnedToday, sessionsToday: workouts.filter((w) => w.log_date === today).length },
      { ...base, sessionsThisWeek: fromDateKey(addDays(today, 1)).getDay() === 0 ? 0 : base.sessionsThisWeek }
    );
  }, [profile, workouts, exercises, burnedToday, today]);

  useEffect(() => {
    if (!habits || !habitLogs) return;
    const build = (day: string): HabitsWidgetProps => {
      const items = habits
        .map((h) => {
          const logs = logsByDate(h.id, habitLogs);
          // Tomorrow (the midnight entry) has no logs yet: good habits start open, bad ones clean.
          const status =
            day === today ? dayStatus(h, logs.get(day), day) : !isScheduled(h, day) ? 'off' : h.kind === 'bad' ? 'done' : 'open';
          return { h, status, streak: habitStats(h, logs).current };
        })
        .filter((x) => x.status !== 'off' && x.status !== 'skipped')
        .map(({ h, status, streak }) => ({ emoji: h.emoji, name: h.name, color: h.color, done: status === 'done', streak }))
        .sort((a, b) => Number(a.done) - Number(b.done));
      return { done: items.filter((i) => i.done).length, total: items.length, items };
    };
    push(HabitsWidget as AnyWidget<HabitsWidgetProps>, build(today), build(addDays(today, 1)));
  }, [habits, habitLogs, today]);
}
