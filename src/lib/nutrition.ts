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

/** Calories you can go over before the next day pays for it. */
export const OVER_GRACE = 200;
/** Going over never pushes a day's goal below this (or below your base goal, if that's lower). */
export const GOAL_FLOOR = 800;

/** A day's goal from the calories carried into it: base plus the carry, held at GOAL_FLOOR (or base, if lower). */
export const goalFor = (base: number, carry: number) => Math.max(Math.min(GOAL_FLOOR, base), base + carry);

/**
 * The carry into the next day after eating `eaten` on a day that started with `carry` (+ left over, − owed).
 * Under: what's left adds on (1800 goal, ate 1200 → +600 → 2400), but first pays off anything the floor held back.
 * Over: the excess minus OVER_GRACE is owed (500 over → −300 → 1500) on top of anything still owed.
 * So a big overshoot keeps the goal at the floor until it's paid off. Burned calories aren't part of it.
 */
export function nextCarry(base: number, carry: number, eaten: number): number {
  const goal = goalFor(base, carry);
  const heldBack = goal - (base + carry); // owed but not taken off yet because of the floor
  const left = goal - eaten;
  return (left >= 0 ? left : Math.min(0, left + OVER_GRACE)) - heldBack;
}

/** Calories carried into `date` (see nextCarry). A day with nothing logged breaks the chain and clears it. */
export function rolledCarry(base: number, eaten: Map<string, number>, date: string): number {
  let start = date;
  while (eaten.has(addDays(start, -1))) start = addDays(start, -1);
  let carry = 0;
  for (let k = start; k < date; k = addDays(k, 1)) carry = nextCarry(base, carry, eaten.get(k)!);
  return carry;
}
