// Props each home-screen widget renders. The app computes them and pushes snapshots
// whenever your data changes (see sync.ts) — widgets can't query Supabase themselves.

export type CaloriesWidgetProps = {
  eaten: number;
  burned: number;
  goal: number;
  protein: number;
  carbs: number;
  fat: number;
  proteinGoal: number;
  carbsGoal: number;
  fatGoal: number;
};

export type ExerciseWidgetProps = {
  burnedToday: number;
  sessionsToday: number;
  sessionsThisWeek: number;
  rankTitle: string;
  rankColor: string;
  rankEmoji: string;
  /** e.g. "Bench Press · Gold II" */
  topExercise: string;
};

export type HabitsWidgetProps = {
  done: number;
  total: number;
  items: { emoji: string; name: string; done: boolean; color: string; streak: number }[];
};
