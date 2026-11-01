import { addDays, dateRange, todayKey, toDateKey, weekday } from './dates';
import type { Habit, HabitLog, HabitSection } from './types';

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

type Template = Omit<Habit, 'id' | 'archived' | 'sort_order' | 'created_at' | 'color' | 'days'> & { color?: string };
export const HABIT_TEMPLATES: Template[] = [
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
  for (const day of dateRange(from, today)) {
    const s = status(day);
    if (s === 'done') {
      total++;
      best = Math.max(best, ++run);
    } else if (s === 'failed' || (s === 'open' && day !== today)) run = 0;
  }

  let counted = 0;
  let hit = 0;
  for (let d = today; counted < 30 && d >= from; d = addDays(d, -1)) {
    const s = status(d);
    if (s === 'off' || s === 'skipped' || (s === 'open' && d === today)) continue;
    counted++;
    if (s === 'done') hit++;
  }

  return { current, best: Math.max(best, current), total, rate30: counted ? hit / counted : 0 };
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
