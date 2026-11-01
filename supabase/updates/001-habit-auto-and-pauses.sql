-- Ember update 001: auto-tracked habits + habit pauses (rest days).
-- Run once in Supabase → SQL Editor. Safe to run again.

-- Habits that tick themselves off from your food log or workouts.
alter table public.habits
  add column if not exists auto text check (auto in ('calorie_cap', 'cardio', 'strength', 'food_log'));

-- Pauses: rest days / breaks for some or all habits, always with a reason.
create table if not exists public.habit_pauses (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id   uuid references public.habits(id) on delete cascade, -- null = every habit
  start_date date not null,
  end_date   date,                                                 -- inclusive; null = until you resume
  reason     text not null,
  created_at timestamptz not null default now()
);
create index if not exists habit_pauses_user on public.habit_pauses (user_id, start_date);

alter table public.habit_pauses enable row level security;
drop policy if exists "own rows" on public.habit_pauses;
create policy "own rows" on public.habit_pauses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
