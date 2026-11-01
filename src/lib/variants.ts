import type { SetPart, WorkoutSet } from './types';

/** A movement variation; `factor` is how many standard reps one rep is worth; `knees` if it can be done from the knees. */
export type Variant = { id: string; name: string; short: string; factor: number; knees?: boolean };

// Dropping to the knees takes about half the work out of any variation (knee push-up ≈ half a standard one).
export const KNEE_FACTOR = 0.5;

// Push-up variations, easiest to hardest. Factors start from measured load (a standard push-up lifts ~64% of
// bodyweight, knee ~49%, hands raised on a bench ~41%, feet raised ~74%) and, for the skill moves, from how
// many standard reps someone who can do them typically manages.
export const PUSHUP_VARIANTS: Variant[] = [
  { id: 'wall', name: 'Wall', short: 'wall', factor: 0.2 },
  { id: 'incline', name: 'Incline (hands raised)', short: 'incline', factor: 0.45 },
  { id: 'standard', name: 'Standard', short: 'standard', factor: 1, knees: true },
  { id: 'wide', name: 'Wide', short: 'wide', factor: 1, knees: true },
  { id: 'deficit', name: 'Deficit (on handles)', short: 'deficit', factor: 1.2, knees: true },
  { id: 'spiderman', name: 'Spiderman', short: 'spiderman', factor: 1.2 },
  { id: 'diamond', name: 'Diamond / close-grip', short: 'diamond', factor: 1.3, knees: true },
  { id: 'decline', name: 'Decline (feet raised)', short: 'decline', factor: 1.35 },
  { id: 'hindu', name: 'Hindu / dive bomber', short: 'hindu', factor: 1.4 },
  { id: 'pike', name: 'Pike', short: 'pike', factor: 1.5 },
  { id: 'clap', name: 'Clap / plyometric', short: 'clap', factor: 1.8, knees: true },
  { id: 'elevated-pike', name: 'Elevated pike', short: 'elev. pike', factor: 2 },
  { id: 'archer', name: 'Archer', short: 'archer', factor: 2.5, knees: true },
  { id: 'typewriter', name: 'Typewriter', short: 'typewriter', factor: 2.5, knees: true },
  { id: 'pseudo-planche', name: 'Pseudo planche', short: 'planche', factor: 2.5 },
  { id: 'handstand', name: 'Handstand (wall)', short: 'handstand', factor: 4 },
  { id: 'one-arm', name: 'One-arm', short: 'one-arm', factor: 6, knees: true },
];

// Sets logged before "on knees" was a toggle used a separate knee variation; it now reads as standard on knees.
const LEGACY_KNEE: Variant = { id: 'knee', name: 'Knee', short: 'knee', factor: 1 * KNEE_FACTOR };

const BY_ID = new Map([...PUSHUP_VARIANTS, LEGACY_KNEE].map((v) => [v.id, v]));
export const variantById = (id: string | undefined) => (id ? BY_ID.get(id) : undefined);

/** Standard reps one rep is worth, e.g. diamond 1.3, knee diamond 0.65. */
export const partFactor = (p: SetPart) => (variantById(p.variant)?.factor ?? 1) * (p.knees ? KNEE_FACTOR : 1);

/** e.g. "diamond", "knee diamond", "knee" (a standard push-up on knees). */
export function partLabel(p: Pick<SetPart, 'variant' | 'knees'>) {
  const v = variantById(p.variant);
  if (!p.knees) return v?.short ?? 'standard';
  return !v || v.id === 'standard' ? 'knee' : `knee ${v.short}`;
}

/** Variations offered for an exercise, or null if it has none. */
export function variantsFor(exercise: { name: string; kind: string }): Variant[] | null {
  return exercise.kind === 'bodyweight' && /push.?up/i.test(exercise.name) ? PUSHUP_VARIANTS : null;
}

/** A set's parts in order: the opening reps, then any other reps done straight after. */
export const setParts = (s: WorkoutSet): SetPart[] => [{ reps: s.reps, variant: s.variant, knees: s.knees }, ...(s.then ?? [])];

/** A set in standard reps, e.g. 3 diamond + 5 knee diamond = 7.15. Sets without variations count rep for rep. */
export const standardReps = (s: WorkoutSet) => setParts(s).reduce((sum, p) => sum + p.reps * partFactor(p), 0);

type Choice = { variant?: string; knees?: boolean };
const worth = (c: Choice) => partFactor({ reps: 0, ...c });

/** What you'd usually drop to next: the knee version (diamond → knee diamond), then plain knee, then the next easier move. */
export function nextEasier(variants: Variant[], cur: Choice): Choice {
  if (variantById(cur.variant)?.knees && !cur.knees) return { variant: cur.variant, knees: true };
  if (cur.knees && cur.variant !== 'standard' && worth(cur) > worth({ variant: 'standard', knees: true })) {
    return { variant: 'standard', knees: true };
  }
  const easier = variants
    .flatMap((v): Choice[] => (v.knees ? [{ variant: v.id }, { variant: v.id, knees: true }] : [{ variant: v.id }]))
    .filter((c) => worth(c) < worth(cur));
  // The hardest of the easier options; on a tie the earlier (more common) variation wins.
  return easier.reduce<Choice | null>((best, c) => (!best || worth(c) > worth(best) ? c : best), null) ?? cur;
}
