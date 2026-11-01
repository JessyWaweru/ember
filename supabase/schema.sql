-- Ember schema. Paste this whole file into Supabase → SQL Editor → Run.
-- Safe to re-run: everything is "if not exists" / "or replace".

-- ───────────────────────── profiles ─────────────────────────
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  display_name   text,
  sex            text check (sex in ('male', 'female')),
  birth_year     int,
  height_cm      numeric,
  weight_kg      numeric,
  goal_weight_kg numeric,
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  goal_type      text check (goal_type in ('lose', 'maintain', 'gain')),
  calorie_goal   int not null default 2000,
  protein_goal   int not null default 150,
  carbs_goal     int not null default 200,
  fat_goal       int not null default 65,
  onboarded      boolean not null default false,
  created_at     timestamptz not null default now()
);

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────── meals ─────────────────────────
create table if not exists public.meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date   date not null,
  meal_type  text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  name       text not null,
  calories   int not null check (calories >= 0),
  protein    numeric not null default 0,
  carbs      numeric not null default 0,
  fat        numeric not null default 0,
  servings   numeric not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists meals_user_date on public.meals (user_id, log_date);

-- ───────────────────────── weight log ─────────────────────────
create table if not exists public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  log_date   date not null,
  weight_kg  numeric not null,
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

-- ───────────────────────── exercises ─────────────────────────
-- kind: strength (sets of reps × weight), bodyweight (sets of reps), cardio (duration / distance)
create table if not exists public.exercises (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  kind       text not null check (kind in ('strength', 'bodyweight', 'cardio')),
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.workout_logs (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users(id) on delete cascade,
  exercise_id     uuid not null references public.exercises(id) on delete cascade,
  log_date        date not null,
  sets            jsonb not null default '[]'::jsonb, -- [{ "reps": 8, "weight": 60 }]
  duration_min    numeric,
  distance_km     numeric,
  calories_burned int not null default 0 check (calories_burned >= 0),
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists workout_logs_user_date on public.workout_logs (user_id, log_date);
create index if not exists workout_logs_exercise on public.workout_logs (exercise_id);

-- ───────────────────────── habits ─────────────────────────
create table if not exists public.habits (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name         text not null,
  emoji        text not null default '✅',
  color        text not null default '#22c55e',
  -- days of week the habit is scheduled: 0 = Sunday … 6 = Saturday
  days         int[] not null default '{0,1,2,3,4,5,6}',
  target_count int not null default 1 check (target_count >= 1),
  -- good: check it off · bad: clean by default, you log a slip
  kind         text not null default 'good' check (kind in ('good', 'bad')),
  section      text not null default 'anytime' check (section in ('morning', 'afternoon', 'evening', 'anytime')),
  -- ticks itself off: calorie_cap (quit: over budget = slip), cardio / strength (any such workout that day),
  -- food_log (any meal logged that day)
  auto         text check (auto in ('calorie_cap', 'cardio', 'strength', 'food_log')),
  archived     boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz not null default now()
);
-- for databases created before auto habits existed
alter table public.habits add column if not exists auto text check (auto in ('calorie_cap', 'cardio', 'strength', 'food_log'));

create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  habit_id   uuid not null references public.habits(id) on delete cascade,
  log_date   date not null,
  count      int not null default 1 check (count >= 0),
  -- skipped days neither break nor extend a streak; failed = slipped on a bad habit
  status     text not null default 'done' check (status in ('done', 'skipped', 'failed')),
  created_at timestamptz not null default now(),
  unique (habit_id, log_date)
);
create index if not exists habit_logs_user_date on public.habit_logs (user_id, log_date);

-- Pauses: rest days / breaks for some or all habits, always with a reason. Paused days don't break streaks.
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

-- ───────────────────────── row level security ─────────────────────────
-- Every user can only see and change their own rows.
alter table public.profiles     enable row level security;
alter table public.meals        enable row level security;
alter table public.weight_logs  enable row level security;
alter table public.exercises    enable row level security;
alter table public.workout_logs enable row level security;
alter table public.habits       enable row level security;
alter table public.habit_logs   enable row level security;
alter table public.habit_pauses enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

do $$
declare t text;
begin
  foreach t in array array['meals', 'weight_logs', 'exercises', 'workout_logs', 'habits', 'habit_logs', 'habit_pauses'] loop
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format(
      'create policy "own rows" on public.%I for all using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
  end loop;
end $$;
