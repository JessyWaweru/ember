import type { Exercise, WorkoutLog } from './types';

// Liftoff-style ranks: every exercise is ranked on its own, based on your best
// performance. Each tier (except the last) is split into three divisions: III → II → I.

export const TIERS = [
  { name: 'Rookie', color: '#8B8B93', emoji: '🪵' },
  { name: 'Bronze', color: '#CD7F32', emoji: '🥉' },
  { name: 'Silver', color: '#C0C7D1', emoji: '🥈' },
  { name: 'Gold', color: '#F5C542', emoji: '🥇' },
  { name: 'Platinum', color: '#5EEAD4', emoji: '💠' },
  { name: 'Diamond', color: '#60A5FA', emoji: '💎' },
  { name: 'Master', color: '#C084FC', emoji: '👑' },
  { name: 'Legend', color: '#FF6B2C', emoji: '🔥' },
] as const;

const DIVISIONS = ['III', 'II', 'I'];

// Thresholds where Bronze, Silver, … Legend start (Rookie starts at 0).
// The ladder follows common strength standards: Bronze ≈ beginner, Silver ≈ novice, Gold ≈ intermediate
// (a few years of real training — already impressive), Platinum ≈ advanced, Diamond ≈ elite gym lifter,
// Master ≈ competitive athlete, Legend ≈ national/world-class. Each step gets harder than the last.
// First match wins, so specific patterns come before general ones.
type Rule = { match: RegExp; thresholds: number[] };

// Strength: best estimated 1-rep max ÷ bodyweight.
const STRENGTH: Rule[] = [
  { match: /romanian|rdl|stiff/i, thresholds: [0.75, 1.1, 1.5, 1.9, 2.2, 2.5, 2.8] },
  { match: /deadlift/i, thresholds: [1.0, 1.5, 2.0, 2.5, 2.9, 3.3, 3.7] },
  // external load only (bodyweight not included)
  { match: /split squat|lunge/i, thresholds: [0.25, 0.45, 0.65, 0.9, 1.1, 1.3, 1.5] },
  { match: /leg press/i, thresholds: [1.0, 1.75, 2.5, 3.25, 4.0, 4.75, 5.5] },
  { match: /squat/i, thresholds: [0.75, 1.1, 1.5, 1.9, 2.3, 2.7, 3.1] },
  { match: /bench|chest press/i, thresholds: [0.5, 0.75, 1.0, 1.35, 1.65, 1.95, 2.3] },
  { match: /overhead|ohp|shoulder press|military/i, thresholds: [0.35, 0.55, 0.75, 0.95, 1.15, 1.35, 1.55] },
  { match: /row/i, thresholds: [0.5, 0.75, 1.0, 1.3, 1.6, 1.85, 2.1] },
  { match: /pulldown/i, thresholds: [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0] },
  { match: /curl|tricep|extension/i, thresholds: [0.2, 0.35, 0.5, 0.7, 0.85, 1.0, 1.15] },
  { match: /raise|fly/i, thresholds: [0.08, 0.14, 0.2, 0.28, 0.36, 0.44, 0.52] },
  { match: /.*/, thresholds: [0.35, 0.55, 0.8, 1.05, 1.3, 1.55, 1.8] },
];

// Bodyweight: most strict reps in a single set, as done by a 75 kg athlete (see bodyweightScale).
const BODYWEIGHT: Rule[] = [
  { match: /pull.?up|chin.?up/i, thresholds: [1, 5, 10, 15, 20, 26, 32] },
  { match: /push.?up/i, thresholds: [10, 20, 35, 50, 65, 80, 100] },
  // reps per leg in one set
  { match: /split squat|lunge/i, thresholds: [8, 15, 25, 35, 45, 60, 75] },
  { match: /dip/i, thresholds: [3, 8, 15, 22, 30, 38, 48] },
  { match: /.*/, thresholds: [10, 20, 35, 50, 65, 80, 100] },
];

// Cardio: distance sports rank on best distance in one session.
const DISTANCE: Rule[] = [
  { match: /walk.*jog|jog.*walk/i, thresholds: [2, 4, 7, 10, 15, 21.1, 30] },
  { match: /walk|hike/i, thresholds: [2, 4, 8, 12, 20, 30, 42.2] },
  { match: /run|jog/i, thresholds: [2, 5, 10, 15, 21.1, 30, 42.2] },
  { match: /cycl|bike/i, thresholds: [5, 15, 30, 50, 80, 120, 160] },
  { match: /swim/i, thresholds: [0.25, 0.5, 1, 2, 3, 5, 10] },
];
// Everything else ranks on its longest session, in minutes.
const DURATION: Rule[] = [
  { match: /box|kick|shadow|hiit|muay|martial/i, thresholds: [10, 20, 30, 45, 60, 90, 120] },
  { match: /.*/, thresholds: [15, 30, 45, 60, 90, 120, 180] },
];

export const epley1RM = (weight: number, reps: number) => (reps <= 1 ? weight : weight * (1 + reps / 30));

// Heavier athletes move more load per rep, so their reps count for more. Strength grows roughly with
// bodyweight^(2/3) (the allometric scaling behind lifting formulas like Wilks), so reps are scaled the same way:
// 15 push-ups at 110 kg count as 19.4, edging out 22 at 60 kg (19.0).
const bodyweightScale = (bodyweightKg: number) => (bodyweightKg / 75) ** (2 / 3);

type Metric = { value: number; thresholds: number[]; format: (v: number) => string; label: string };

function metricFor(exercise: Exercise, logs: WorkoutLog[], bodyweightKg: number): Metric {
  if (exercise.kind === 'strength') {
    const best = Math.max(
      0,
      ...logs.flatMap((l) => l.sets.map((s) => epley1RM(s.weight ?? 0, s.reps)))
    );
    return {
      value: best / bodyweightKg,
      thresholds: STRENGTH.find((r) => r.match.test(exercise.name))!.thresholds,
      format: (v) => `${(v * bodyweightKg).toFixed(0)} kg`,
      label: 'Est. 1RM',
    };
  }
  if (exercise.kind === 'bodyweight') {
    const best = Math.max(0, ...logs.flatMap((l) => l.sets.map((s) => s.reps)));
    const scale = bodyweightScale(bodyweightKg);
    return {
      value: best * scale,
      thresholds: BODYWEIGHT.find((r) => r.match.test(exercise.name))!.thresholds,
      // Shown in your own reps at your current bodyweight.
      format: (v) => `${Math.round(v / scale)} reps`,
      label: 'Best set',
    };
  }
  const distanceRule = DISTANCE.find((r) => r.match.test(exercise.name));
  if (distanceRule) {
    return {
      value: Math.max(0, ...logs.map((l) => l.distance_km ?? 0)),
      thresholds: distanceRule.thresholds,
      format: (v) => `${v.toFixed(1)} km`,
      label: 'Longest distance',
    };
  }
  return {
    value: Math.max(0, ...logs.map((l) => l.duration_min ?? 0)),
    thresholds: DURATION.find((r) => r.match.test(exercise.name))!.thresholds,
    format: (v) => `${Math.round(v)} min`,
    label: 'Longest session',
  };
}

export type Rank = {
  tierIndex: number;
  tier: (typeof TIERS)[number];
  division: string | null;
  /** e.g. "Gold II" */
  title: string;
  /** 0–1 progress toward the next division (or 1 at the top) */
  progress: number;
  /** Continuous score: tierIndex + fraction, handy for averaging and rank-up checks */
  score: number;
  /** The raw (bodyweight-adjusted) metric, for comparing performances finer than divisions */
  value: number;
  metricLabel: string;
  current: string;
  next: string | null;
};

export function rankExercise(exercise: Exercise, logs: WorkoutLog[], bodyweightKg: number | null): Rank {
  const m = metricFor(exercise, logs, bodyweightKg || 75);
  const starts = [0, ...m.thresholds];
  let tierIndex = 0;
  while (tierIndex < starts.length - 1 && m.value >= starts[tierIndex + 1]) tierIndex++;

  const tier = TIERS[tierIndex];
  if (tierIndex === TIERS.length - 1) {
    return {
      tierIndex, tier, division: null, title: tier.name, progress: 1, score: tierIndex, value: m.value,
      metricLabel: m.label, current: m.format(m.value), next: null,
    };
  }

  const lo = starts[tierIndex];
  const hi = starts[tierIndex + 1];
  const frac = Math.min(0.9999, (m.value - lo) / (hi - lo));
  const divIndex = Math.floor(frac * 3);
  const divStart = lo + ((hi - lo) * divIndex) / 3;
  const divEnd = lo + ((hi - lo) * (divIndex + 1)) / 3;
  return {
    tierIndex,
    tier,
    division: DIVISIONS[divIndex],
    title: `${tier.name} ${DIVISIONS[divIndex]}`,
    progress: (m.value - divStart) / (divEnd - divStart),
    score: tierIndex + divIndex / 3,
    value: m.value,
    metricLabel: m.label,
    current: m.format(m.value),
    next: m.format(divEnd),
  };
}

export type SessionRank = { log: WorkoutLog; /** what this session alone earns */ own: Rank; /** your rank after it */ best: Rank };

/** Each session oldest → newest, with its own rank and your best rank up to that point. */
export function rankHistory(exercise: Exercise, logs: WorkoutLog[], bodyweightKg: number | null): SessionRank[] {
  const chrono = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date) || a.created_at.localeCompare(b.created_at));
  return chrono.map((log, i) => ({
    log,
    own: rankExercise(exercise, [log], bodyweightKg),
    best: rankExercise(exercise, chrono.slice(0, i + 1), bodyweightKg),
  }));
}

/** Overall athlete rank: the average of your exercise ranks. */
export function overallRank(ranks: Rank[]): { title: string; tier: (typeof TIERS)[number] } {
  if (ranks.length === 0) return { title: 'Unranked', tier: TIERS[0] };
  const avg = ranks.reduce((s, r) => s + r.score, 0) / ranks.length;
  const tierIndex = Math.min(TIERS.length - 1, Math.floor(avg + 1e-6));
  const tier = TIERS[tierIndex];
  if (tierIndex === TIERS.length - 1) return { title: tier.name, tier };
  const div = DIVISIONS[Math.min(2, Math.floor((avg - tierIndex) * 3 + 1e-6))];
  return { title: `${tier.name} ${div}`, tier };
}
