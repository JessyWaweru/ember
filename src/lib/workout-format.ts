import type { ExerciseKind, WorkoutLog, WorkoutSet } from './types';
import { partLabel, setParts } from './variants';

/** e.g. "8", "6 diamond", "3 diamond + 5 knee diamond". Standard reps go unlabelled. */
function describeSet(s: WorkoutSet): string {
  return setParts(s)
    .map((p) => {
      const label = partLabel(p);
      return label === 'standard' ? String(p.reps) : `${p.reps} ${label}`;
    })
    .join(' + ');
}

/** One-line summary, e.g. "3 × 12" / "3 sets · best 10 × 20 kg" / "3 sets · 10, 8, 3 + 5 knee" / "45 min · 4.2 km". */
export function describeWorkout(kind: ExerciseKind, w: Pick<WorkoutLog, 'sets' | 'duration_min' | 'distance_km'>): string {
  const parts: string[] = [];
  if (kind === 'cardio') {
    if (w.duration_min) parts.push(`${w.duration_min} min`);
    if (w.distance_km) parts.push(`${w.distance_km} km`);
  } else if (w.sets.length) {
    const labels = w.sets.map(describeSet);
    const sameReps = w.sets.every((s, i) => labels[i] === labels[0] && (s.weight ?? 0) === (w.sets[0].weight ?? 0));
    const weight = (s: { weight?: number }) => (s.weight ? ` × ${s.weight} kg` : '');
    if (sameReps) parts.push(`${w.sets.length} × ${labels[0]}${weight(w.sets[0])}`);
    else if (labels.some((l) => /\D/.test(l))) parts.push(`${w.sets.length} sets · ${labels.join(', ')}`);
    else parts.push(`${w.sets.length} sets · ${labels.join('/')} reps`);
    if (w.duration_min) parts.push(`${w.duration_min} min`);
  }
  return parts.join(' · ') || 'Logged';
}
