import type { WorkoutSet } from './types';

/** A movement variation; `factor` is how many standard reps one rep is worth. */
export type Variant = { id: string; name: string; short: string; factor: number };

// Push-up variations, easiest to hardest. Factors start from measured load (a standard push-up lifts ~64% of
// bodyweight, knee ~49%, hands raised on a bench ~41%, feet raised ~74%) and, for the skill moves, from how
// many standard reps someone who can do them typically manages.
export const PUSHUP_VARIANTS: Variant[] = [
  { id: 'wall', name: 'Wall', short: 'wall', factor: 0.2 },
  { id: 'incline', name: 'Incline (hands raised)', short: 'incline', factor: 0.45 },
  { id: 'knee', name: 'Knee', short: 'knee', factor: 0.5 },
  { id: 'standard', name: 'Standard', short: 'standard', factor: 1 },
  { id: 'wide', name: 'Wide', short: 'wide', factor: 1 },
  { id: 'deficit', name: 'Deficit (on handles)', short: 'deficit', factor: 1.2 },
  { id: 'spiderman', name: 'Spiderman', short: 'spiderman', factor: 1.2 },
  { id: 'diamond', name: 'Diamond / close-grip', short: 'diamond', factor: 1.3 },
  { id: 'decline', name: 'Decline (feet raised)', short: 'decline', factor: 1.35 },
  { id: 'hindu', name: 'Hindu / dive bomber', short: 'hindu', factor: 1.4 },
  { id: 'pike', name: 'Pike', short: 'pike', factor: 1.5 },
  { id: 'clap', name: 'Clap / plyometric', short: 'clap', factor: 1.8 },
  { id: 'elevated-pike', name: 'Elevated pike', short: 'elev. pike', factor: 2 },
  { id: 'archer', name: 'Archer', short: 'archer', factor: 2.5 },
  { id: 'typewriter', name: 'Typewriter', short: 'typewriter', factor: 2.5 },
  { id: 'pseudo-planche', name: 'Pseudo planche', short: 'planche', factor: 2.5 },
  { id: 'handstand', name: 'Handstand (wall)', short: 'handstand', factor: 4 },
  { id: 'one-arm', name: 'One-arm', short: 'one-arm', factor: 6 },
];

const BY_ID = new Map(PUSHUP_VARIANTS.map((v) => [v.id, v]));
export const variantById = (id: string | undefined) => (id ? BY_ID.get(id) : undefined);

/** Variations offered for an exercise, or null if it has none. */
export function variantsFor(exercise: { name: string; kind: string }): Variant[] | null {
  return exercise.kind === 'bodyweight' && /push.?up/i.test(exercise.name) ? PUSHUP_VARIANTS : null;
}

/** A set's parts in order: the opening reps, then any easier/harder reps done straight after. */
export const setParts = (s: WorkoutSet) => [{ reps: s.reps, variant: s.variant }, ...(s.then ?? [])];

/** A set in standard reps, e.g. 3 standard + 5 knee = 5.5. Sets without variations count rep for rep. */
export const standardReps = (s: WorkoutSet) =>
  setParts(s).reduce((sum, p) => sum + p.reps * (variantById(p.variant)?.factor ?? 1), 0);
