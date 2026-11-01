export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type ExerciseKind = 'strength' | 'bodyweight' | 'cardio';
export type Sex = 'male' | 'female';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type GoalType = 'lose' | 'maintain' | 'gain';

export type Profile = {
  id: string;
  display_name: string | null;
  sex: Sex | null;
  birth_year: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  goal_weight_kg: number | null;
  activity_level: ActivityLevel | null;
  goal_type: GoalType | null;
  calorie_goal: number;
  protein_goal: number;
  carbs_goal: number;
  fat_goal: number;
  onboarded: boolean;
};

export type Meal = {
  id: string;
  log_date: string;
  meal_type: MealType;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servings: number;
  created_at: string;
};
export type NewMeal = Omit<Meal, 'id' | 'created_at'>;

export type WeightLog = { id: string; log_date: string; weight_kg: number };

export type Exercise = { id: string; name: string; kind: ExerciseKind; created_at: string };

export type SetPart = { reps: number; variant?: string; knees?: boolean };
/** `variant` is a variation id (see variants.ts), `knees` its knee version; `then` holds reps done straight after. */
export type WorkoutSet = SetPart & { weight?: number; then?: SetPart[] };

export type WorkoutLog = {
  id: string;
  exercise_id: string;
  log_date: string;
  sets: WorkoutSet[];
  duration_min: number | null;
  distance_km: number | null;
  calories_burned: number;
  notes: string | null;
  created_at: string;
};
export type NewWorkoutLog = Omit<WorkoutLog, 'id' | 'created_at'>;

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  color: string;
  days: number[];
  target_count: number;
  kind: HabitKind;
  section: HabitSection;
  archived: boolean;
  sort_order: number;
  created_at: string;
};
export type NewHabit = Pick<Habit, 'name' | 'emoji' | 'color' | 'days' | 'target_count' | 'kind' | 'section'>;

export type HabitKind = 'good' | 'bad';
export type HabitSection = 'morning' | 'afternoon' | 'evening' | 'anytime';
export type HabitLogStatus = 'done' | 'skipped' | 'failed';
export type HabitLog = { id: string; habit_id: string; log_date: string; count: number; status: HabitLogStatus };
