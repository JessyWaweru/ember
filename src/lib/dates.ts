// All "days" in the app are local calendar dates stored as 'YYYY-MM-DD' strings,
// so a meal logged at 11pm counts toward that day no matter the timezone.

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export const todayKey = () => toDateKey(new Date());

export function addDays(key: string, days: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + days);
  return toDateKey(d);
}

/** Inclusive list of date keys from `start` to `end`. */
export function dateRange(start: string, end: string): string[] {
  const out: string[] = [];
  for (let k = start; k <= end; k = addDays(k, 1)) out.push(k);
  return out;
}

export function weekday(key: string): number {
  return fromDateKey(key).getDay();
}

export function prettyDay(key: string): string {
  const today = todayKey();
  if (key === today) return 'Today';
  if (key === addDays(today, -1)) return 'Yesterday';
  if (key === addDays(today, 1)) return 'Tomorrow';
  return fromDateKey(key).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
}

export const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/** Current and best run of consecutive days in `days`. An empty today doesn't break the current run yet. */
export function dayStreaks(days: Set<string>): { current: number; best: number } {
  const today = todayKey();
  let current = 0;
  for (let k = days.has(today) ? today : addDays(today, -1); days.has(k); k = addDays(k, -1)) current++;
  let best = 0;
  for (const k of days) {
    if (days.has(addDays(k, -1))) continue; // only count from the first day of each run
    let run = 0;
    for (let d = k; days.has(d); d = addDays(d, 1)) run++;
    best = Math.max(best, run);
  }
  return { current, best };
}
