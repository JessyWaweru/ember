import type { ExerciseKind, MealType } from './types';

// Your routine — created in your account automatically the first time you open Train.
export const STARTER_EXERCISES: { name: string; kind: ExerciseKind }[] = [
  { name: 'Walking', kind: 'cardio' },
  { name: 'Walk/Jog', kind: 'cardio' },
  { name: 'Push-up', kind: 'bodyweight' },
  { name: 'Bulgarian Split Squat', kind: 'bodyweight' },
  { name: 'Shadow Kickboxing', kind: 'cardio' },
];

// Offered when adding another exercise; picking one creates it in your account.
export const EXERCISE_CATALOG: { name: string; kind: ExerciseKind }[] = [
  ...STARTER_EXERCISES,
  { name: 'Weighted Bulgarian Split Squat', kind: 'strength' },
  { name: 'Bench Press', kind: 'strength' },
  { name: 'Squat', kind: 'strength' },
  { name: 'Deadlift', kind: 'strength' },
  { name: 'Overhead Press', kind: 'strength' },
  { name: 'Barbell Row', kind: 'strength' },
  { name: 'Incline Dumbbell Press', kind: 'strength' },
  { name: 'Lat Pulldown', kind: 'strength' },
  { name: 'Leg Press', kind: 'strength' },
  { name: 'Romanian Deadlift', kind: 'strength' },
  { name: 'Bicep Curl', kind: 'strength' },
  { name: 'Tricep Extension', kind: 'strength' },
  { name: 'Lateral Raise', kind: 'strength' },
  { name: 'Pull-up', kind: 'bodyweight' },
  { name: 'Dips', kind: 'bodyweight' },
  { name: 'Sit-up', kind: 'bodyweight' },
  { name: 'Running', kind: 'cardio' },
  { name: 'Cycling', kind: 'cardio' },
  { name: 'Swimming', kind: 'cardio' },
  { name: 'Jump Rope', kind: 'cardio' },
  { name: 'HIIT', kind: 'cardio' },
  { name: 'Football', kind: 'cardio' },
  { name: 'Basketball', kind: 'cardio' },
];

export const KIND_LABEL: Record<ExerciseKind, string> = {
  strength: 'Weights',
  bodyweight: 'Bodyweight',
  cardio: 'Cardio',
};

export const MEAL_TYPES: { type: MealType; label: string; emoji: string }[] = [
  { type: 'breakfast', label: 'Breakfast', emoji: '🍳' },
  { type: 'lunch', label: 'Lunch', emoji: '🥗' },
  { type: 'dinner', label: 'Dinner', emoji: '🍝' },
  { type: 'snack', label: 'Snacks', emoji: '🍎' },
];

