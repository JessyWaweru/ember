import { addDays, dateRange, todayKey, toDateKey, weekday } from './dates';
import { goalFor, nextCarry, rolledCarry } from './nutrition';
import type { Habit, HabitAuto, HabitLog, HabitPause, HabitSection } from './types';

export const HABIT_COLORS = ['#22C55E', '#A78BFA', '#F472B6', '#38BDF8', '#FACC15', '#FB923C', '#F87171', '#2DD4BF'];

export const HABIT_EMOJIS = [
  '✅', '💧', '🏃', '💪', '🧘', '📚', '🛏️', '🥗', '🍎', '🚶', '🥊', '☀️',
  '🌙', '✍️', '🧠', '🦷', '💊', '🚿', '🙏', '🎯', '📵', '🚭', '🍺', '🍬',
];

export const SECTIONS: { value: HabitSection; label: string; emoji: string }[] = [
  { value: 'morning', label: 'Morning', emoji: '🌅' },
  { value: 'afternoon', label: 'Afternoon', emoji: '☀️' },
  { value: 'evening', label: 'Evening', emoji: '🌙' },
  { value: 'anytime', label: 'Anytime', emoji: '⏳' },
];

export const AUTO_OPTIONS: { value: HabitAuto; label: string; detail: string; kind: Habit['kind'] }[] = [
  { value: 'calorie_cap', label: 'Stay under calories', detail: 'A slip whenever a day goes over its budget (goal, adjusted by the day before, + burned). Cleared once a later day comes in on budget.', kind: 'bad' },
  { value: 'cardio', label: 'Any cardio workout', detail: 'Done when you log a cardio workout that day.', kind: 'good' },
  { value: 'strength', label: 'Any strength workout', detail: 'Done when you log a weights or bodyweight workout that day.', kind: 'good' },
  { value: 'food_log', label: 'Log your food', detail: 'Done on any day you log at least one meal.', kind: 'good' },
];
export const autoLabel = (auto: HabitAuto) => AUTO_OPTIONS.find((o) => o.value === auto)!.label;

type Template = Omit<Habit, 'id' | 'archived' | 'sort_order' | 'created_at' | 'color' | 'days' | 'auto'> & { color?: string; auto?: HabitAuto };
export const HABIT_TEMPLATES: Template[] = [
  { name: 'Max calories', emoji: '🎯', kind: 'bad', section: 'anytime', target_count: 1, color: '#FB923C', auto: 'calorie_cap' },
  { name: 'Cardio', emoji: '🏃', kind: 'good', section: 'anytime', target_count: 1, color: '#22C55E', auto: 'cardio' },
  { name: 'Strength training', emoji: '💪', kind: 'good', section: 'anytime', target_count: 1, color: '#F87171', auto: 'strength' },
  { name: 'Log my food', emoji: '📝', kind: 'good', section: 'evening', target_count: 1, color: '#FACC15', auto: 'food_log' },
  { name: 'Drink water', emoji: '💧', kind: 'good', section: 'anytime', target_count: 8, color: '#38BDF8' },
  { name: 'Walk 10k steps', emoji: '🚶', kind: 'good', section: 'anytime', target_count: 1, color: '#22C55E' },
  { name: 'Workout', emoji: '💪', kind: 'good', section: 'morning', target_count: 1, color: '#FB923C' },
  { name: 'Hit protein goal', emoji: '🥩', kind: 'good', section: 'evening', target_count: 1, color: '#F87171' },
  { name: 'Read 10 pages', emoji: '📚', kind: 'good', section: 'evening', target_count: 1, color: '#A78BFA' },
  { name: 'Meditate', emoji: '🧘', kind: 'good', section: 'morning', target_count: 1, color: '#2DD4BF' },
  { name: 'Sleep by 11pm', emoji: '🛏️', kind: 'good', section: 'evening', target_count: 1, color: '#A78BFA' },
  { name: 'No sugar', emoji: '🍬', kind: 'bad', section: 'anytime', target_count: 1, color: '#F472B6' },
  { name: 'No junk food', emoji: '🍔', kind: 'bad', section: 'anytime', target_count: 1, color: '#FACC15' },
  { name: 'No doom-scrolling', emoji: '📵', kind: 'bad', section: 'anytime', target_count: 1, color: '#F87171' },
];

export const PAUSE_REASONS = ['Rest day', 'Sick', 'Injured', 'Travelling', 'Busy week', 'Deload'];

/** What the auto habits read: daily calories eaten/burned, workout days by type, and the calorie goal. */
export type AutoInputs = {
  eaten: Map<string, number>;
  burned: Map<string, number>;
  cardioDays: Set<string>;
  strengthDays: Set<string>;
  calorieGoal: number;
};

/** Does a pause cover this habit on this day? */
export const pauseCovers = (p: HabitPause, habitId: string, key: string) =>
  (p.habit_id === null || p.habit_id === habitId) && key >= p.start_date && (p.end_date === null || key <= p.end_date);

/**
 * Your check-ins plus what the app fills in: auto habits from meals and workouts (from the day you add them),
 * and paused days as skips carrying their reason. Your own log wins, except a pause beats anything short of done.
 */
export function effectiveLogs(habits: Habit[], logs: HabitLog[], pauses: HabitPause[], auto: AutoInputs | null): HabitLog[] {
  const today = todayKey();
  const out = new Map(logs.map((l) => [`${l.habit_id}|${l.log_date}`, l]));
  const put = (h: Habit, key: string, log: Omit<HabitLog, 'id' | 'habit_id' | 'log_date'>) =>
    out.set(`${h.id}|${key}`, { id: `auto-${h.id}-${key}`, habit_id: h.id, log_date: key, ...log });

  if (auto) {
    for (const h of habits) {
      if (!h.auto) continue;
      // Calories carried day to day (see nextCarry), walked forward a day at a time.
      let carry = rolledCarry(auto.calorieGoal, auto.eaten, createdKey(h));
      // Over-budget days not made up for yet. They clear once a later finished day is on budget with nothing left
      // owed; a day with nothing logged ends the run and they stay slips.
      let slips: string[] = [];
      const settle = (recovered: boolean) => {
        for (const k of slips) {
          if (!out.has(`${h.id}|${k}`)) put(h, k, recovered ? { count: 1, status: 'done', recovered } : { count: 1, status: 'failed' });
        }
        slips = [];
      };
      for (const key of dateRange(createdKey(h), today)) {
        const eaten = auto.eaten.get(key);
        const dayGoal = goalFor(auto.calorieGoal, carry);
        carry = eaten === undefined ? 0 : nextCarry(auto.calorieGoal, carry, eaten);
        if (h.auto === 'calorie_cap') {
          if (eaten === undefined) settle(false);
          else if (eaten > dayGoal + (auto.burned.get(key) ?? 0)) slips.push(key);
          else if (key < today && carry >= 0) settle(true);
          continue;
        }
        if (out.has(`${h.id}|${key}`)) continue;
        if (h.auto === 'food_log' ? auto.eaten.has(key) : (h.auto === 'cardio' ? auto.cardioDays : auto.strengthDays).has(key)) {
          put(h, key, { count: h.target_count, status: 'done' });
        }
      }
      settle(false);
    }
  }

  for (const p of pauses) {
    const end = p.end_date && p.end_date < today ? p.end_date : today;
    for (const h of habits) {
      if (p.habit_id !== null && p.habit_id !== h.id) continue;
      for (const key of dateRange(p.start_date, end)) {
        const existing = out.get(`${h.id}|${key}`);
        if (existing?.status === 'done' && existing.count >= h.target_count) continue;
        put(h, key, { count: 0, status: 'skipped', pause: p });
      }
    }
  }
  return [...out.values()];
}

/** Pauses that are running today or start later, newest first. */
export const currentPauses = (pauses: HabitPause[]) => {
  const today = todayKey();
  return pauses.filter((p) => p.end_date === null || p.end_date >= today);
};

/** Streak milestones, GRIT-style achievements. */
export const MILESTONES = [3, 7, 14, 30, 50, 100, 200, 365];

export const isScheduled = (habit: Habit, key: string) => habit.days.includes(weekday(key));

export function logsByDate(habitId: string, logs: HabitLog[]): Map<string, HabitLog> {
  const m = new Map<string, HabitLog>();
  for (const l of logs) if (l.habit_id === habitId) m.set(l.log_date, l);
  return m;
}

/**
 * done    – completed (good) / stayed clean (bad)
 * open    – scheduled, not done yet (a past open day is a miss)
 * failed  – slipped on a bad habit
 * skipped – you skipped it; doesn't break the streak
 * off     – not scheduled, or before the habit existed
 */
export type DayStatus = 'done' | 'open' | 'failed' | 'skipped' | 'off';

export const createdKey = (habit: Habit) => toDateKey(new Date(habit.created_at));

export function dayStatus(habit: Habit, log: HabitLog | undefined, key: string): DayStatus {
  if (log?.status === 'skipped') return 'skipped';
  if (habit.kind === 'bad') {
    if (log?.status === 'failed') return 'failed';
    if (key < createdKey(habit) || key > todayKey()) return 'off';
    return isScheduled(habit, key) ? 'done' : 'off';
  }
  const done = log?.status === 'done' && log.count >= habit.target_count;
  // A good habit done on an unscheduled day still shows as done (bonus), but never breaks anything.
  if (!isScheduled(habit, key)) return done ? 'done' : 'off';
  return done ? 'done' : 'open';
}

export type HabitStats = {
  current: number;
  best: number;
  total: number;
  /** completion rate over the last 30 counted days, 0–1 */
  rate30: number;
  /** completion rate over every counted day since you started, 0–1 */
  rateAll: number;
  /** days since you started (counting the first day) */
  days: number;
  start: string;
};

export function habitStats(habit: Habit, logs: Map<string, HabitLog>): HabitStats {
  const today = todayKey();
  const status = (k: string) => dayStatus(habit, logs.get(k), k);

  // Backfilled logs from before the habit was created still count.
  const created = createdKey(habit);
  const firstLog = [...logs.keys()].sort()[0];
  const from = firstLog && firstLog < created ? firstLog : created;

  // Current streak: an unfinished today doesn't break it yet.
  let current = 0;
  for (let k = today; k >= from; k = addDays(k, -1)) {
    const s = status(k);
    if (s === 'done') current++;
    else if (s === 'failed' || (s === 'open' && k !== today)) break;
  }

  let best = 0;
  let run = 0;
  let total = 0;
  let countedAll = 0;
  const range = dateRange(from, today);
  for (const day of range) {
    const s = status(day);
    if (s === 'done') {
      total++;
      best = Math.max(best, ++run);
    } else if (s === 'failed' || (s === 'open' && day !== today)) run = 0;
    if (s !== 'off' && s !== 'skipped' && !(s === 'open' && day === today)) countedAll++;
  }

  let counted = 0;
  let hit = 0;
  for (let d = today; counted < 30 && d >= from; d = addDays(d, -1)) {
    const s = status(d);
    if (s === 'off' || s === 'skipped' || (s === 'open' && d === today)) continue;
    counted++;
    if (s === 'done') hit++;
  }

  return {
    current,
    best: Math.max(best, current),
    total,
    rate30: counted ? hit / counted : 0,
    rateAll: countedAll ? total / countedAll : 0,
    days: range.length,
    start: from,
  };
}

/** Days in a row where every scheduled habit was done (skips are fine). */
export function perfectDayStreak(habits: Habit[], logs: HabitLog[]): number {
  if (habits.length === 0) return 0;
  const maps = new Map(habits.map((h) => [h.id, logsByDate(h.id, logs)]));
  const earliest = habits.map(createdKey).sort()[0];
  const today = todayKey();
  let streak = 0;
  for (let k = today; k >= earliest; k = addDays(k, -1)) {
    const states = habits.map((h) => dayStatus(h, maps.get(h.id)!.get(k), k));
    const relevant = states.filter((s) => s !== 'off' && s !== 'skipped');
    if (relevant.length === 0) continue;
    const perfect = relevant.every((s) => s === 'done');
    if (perfect) streak++;
    else if (k !== today) break;
  }
  return streak;
}

/** How many of the day's habits that count were done. Habits only count from the day they were added. */
export function dayProgress(habits: Habit[], maps: Map<string, Map<string, HabitLog>>, key: string) {
  let done = 0;
  let total = 0;
  for (const h of habits) {
    const log = maps.get(h.id)?.get(key);
    if (key < createdKey(h) && !log) continue;
    const s = dayStatus(h, log, key);
    if (s === 'off' || s === 'skipped' || (s === 'open' && key === todayKey())) continue;
    total++;
    if (s === 'done') done++;
  }
  return { done, total };
}

export type OverallStats = {
  rate30: number;
  /** completion since your first habit began */
  rateAll: number;
  since: string;
  perfect30: number;
  perfectCurrent: number;
  perfectBest: number;
  wins: number;
  /** completion per week, oldest first, for the last `weeks` weeks (null = nothing counted) */
  weekly: { start: string; rate: number | null }[];
  /** completion by weekday (0 = Sunday) over the same weeks */
  byWeekday: (number | null)[];
  /** completion per day for the heatmap, keyed by date (null = nothing counted) */
  daily: Map<string, number | null>;
};

export function overallStats(habits: Habit[], logs: HabitLog[], weeks = 12): OverallStats {
  const today = todayKey();
  const maps = new Map(habits.map((h) => [h.id, logsByDate(h.id, logs)]));
  const earliest = habits.length ? habits.map(createdKey).sort()[0] : today;
  const from = earliest;

  const daily = new Map<string, number | null>();
  let wins = 0;
  let countedAll = 0;
  let run = 0;
  let perfectBest = 0;
  for (const key of dateRange(from, today)) {
    const { done, total } = dayProgress(habits, maps, key);
    wins += done;
    countedAll += total;
    daily.set(key, total ? done / total : null);
    if (total === 0) continue;
    if (done === total) perfectBest = Math.max(perfectBest, ++run);
    else if (key !== today) run = 0;
  }

  const rateOver = (keys: string[]) => {
    let done = 0;
    let total = 0;
    for (const k of keys) {
      const p = dayProgress(habits, maps, k);
      done += p.done;
      total += p.total;
    }
    return total ? done / total : null;
  };

  const last30 = dateRange(addDays(today, -29), today);
  const thisSunday = addDays(today, -weekday(today));
  const weekly = Array.from({ length: weeks }, (_, i) => {
    const start = addDays(thisSunday, (i - weeks + 1) * 7);
    return { start, rate: rateOver(dateRange(start, addDays(start, 6)).filter((k) => k <= today)) };
  });
  const span = dateRange(addDays(thisSunday, -(weeks - 1) * 7), today);
  const byWeekday = [0, 1, 2, 3, 4, 5, 6].map((d) => rateOver(span.filter((k) => weekday(k) === d)));

  const perfectCurrent = perfectDayStreak(habits, logs);
  return {
    rate30: rateOver(last30) ?? 0,
    rateAll: countedAll ? wins / countedAll : 0,
    since: from,
    perfect30: last30.filter((k) => {
      const p = dayProgress(habits, maps, k);
      return p.total > 0 && p.done === p.total;
    }).length,
    perfectCurrent,
    perfectBest: Math.max(perfectBest, perfectCurrent),
    wins,
    weekly,
    byWeekday,
    daily,
  };
}
