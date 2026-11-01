import type { ExerciseKind, WorkoutLog } from './types';

/** One-line summary, e.g. "3 × 12" / "3 sets · best 10 × 20 kg" / "45 min · 4.2 km". */
export function describeWorkout(kind: ExerciseKind, w: Pick<WorkoutLog, 'sets' | 'duration_min' | 'distance_km'>): string {
  const parts: string[] = [];
  if (kind === 'cardio') {
    if (w.duration_min) parts.push(`${w.duration_min} min`);
    if (w.distance_km) parts.push(`${w.distance_km} km`);
  } else if (w.sets.length) {
    const sameReps = w.sets.every((s) => s.reps === w.sets[0].reps && (s.weight ?? 0) === (w.sets[0].weight ?? 0));
    const weight = (s: { weight?: number }) => (s.weight ? ` × ${s.weight} kg` : '');
    if (sameReps) parts.push(`${w.sets.length} × ${w.sets[0].reps}${weight(w.sets[0])}`);
    else parts.push(`${w.sets.length} sets · ${w.sets.map((s) => s.reps).join('/')} reps`);
    if (w.duration_min) parts.push(`${w.duration_min} min`);
  }
  return parts.join(' · ') || 'Logged';
}
