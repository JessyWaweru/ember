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
