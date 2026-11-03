import { addDays } from './dates';
import type { ActivityLevel, GoalType, Sex } from './types';

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

export const ACTIVITY_LABEL: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary (desk job)',
  light: 'Light (1–2 workouts/wk)',
  moderate: 'Moderate (3–4 workouts/wk)',
  active: 'Active (5–6 workouts/wk)',
  very_active: 'Very active (daily + physical job)',
};

// ~500 kcal/day ≈ 0.5 kg/week
const GOAL_DELTA: Record<GoalType, number> = { lose: -500, maintain: 0, gain: 300 };

type Input = {
  sex: Sex;
  birthYear: number;
  heightCm: number;
  weightKg: number;
  activity: ActivityLevel;
  goal: GoalType;
};

/** Mifflin-St Jeor BMR × activity factor, adjusted for the goal. */
export function recommendTargets({ sex, birthYear, heightCm, weightKg, activity, goal }: Input) {
  const age = new Date().getFullYear() - birthYear;
  const bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + (sex === 'male' ? 5 : -161);
  const tdee = bmr * ACTIVITY_FACTOR[activity];
  const calories = Math.max(1200, Math.round((tdee + GOAL_DELTA[goal]) / 10) * 10);

  // Protein 2 g/kg, fat 25% of calories, carbs fill the rest.
  const protein = Math.round(weightKg * 2);
  const fat = Math.round((calories * 0.25) / 9);
  const carbs = Math.max(0, Math.round((calories - protein * 4 - fat * 9) / 4));
  return { calories, protein, carbs, fat };
}

// Compendium of Physical Activities MET values; first match wins.
const METS: [RegExp, number][] = [
  [/walk.*jog|jog.*walk/i, 6],
  [/walk/i, 3.5],
  [/run|jog/i, 9],
  [/box|kick|shadow|muay|martial/i, 7],
  [/hiit|jump rope/i, 8],
  [/split squat|lunge|squat/i, 5],
  [/push.?up|pull.?up|dip|sit.?up/i, 4],
];

/** Rough MET-based burn estimate, used to pre-fill the calories field (you can always overwrite it). */
export function estimateBurn(name: string, kind: 'strength' | 'bodyweight' | 'cardio', minutes: number, weightKg: number) {
  const met = METS.find(([re]) => re.test(name))?.[1] ?? (kind === 'cardio' ? 7 : kind === 'strength' ? 5 : 4);
  return Math.round((met * 3.5 * weightKg * minutes) / 200);
}

// kcal per rep per kg of bodyweight, for bodyweight moves. Derived from the mechanical work of one rep (share of
// bodyweight moved × distance) at ~20% muscular efficiency, plus the cost of holding position; e.g. a standard
// push-up at 75 kg ≈ 0.4 kcal. Split squats/lunges are per leg, so both legs' reps are counted.
const REP_KCAL_PER_KG: [RegExp, number][] = [
  [/pull.?up|chin.?up/i, 0.01],
  [/dip/i, 0.009],
  [/split squat|lunge/i, 0.01],
  [/sit.?up|crunch/i, 0.004],
  [/push.?up/i, 0.005],
];

/** Burn from reps, for bodyweight exercises. `reps` is in standard reps (variations already weighted by difficulty). */
export function estimateRepBurn(name: string, reps: number, weightKg: number) {
  const perKg = REP_KCAL_PER_KG.find(([re]) => re.test(name))?.[1] ?? 0.005;
  return Math.round(reps * perKg * weightKg);
}

/**
 * A day's calorie goal with unused calories rolled over: whatever was left of yesterday's goal is added on top
 * (1800 goal, ate 1200 → 2400 today; ate 2000 of that → 2200 tomorrow). Going over adds nothing and takes nothing.
 * Burned calories aren't part of it. A day with nothing logged breaks the chain, so skipped days don't pile up.
 */
export function rolledGoal(base: number, eaten: Map<string, number>, date: string): number {
  let start = date;
  while (eaten.has(addDays(start, -1))) start = addDays(start, -1);
  let goal = base;
  for (let k = start; k < date; k = addDays(k, 1)) goal = base + Math.max(0, goal - eaten.get(k)!);
  return goal;
}
