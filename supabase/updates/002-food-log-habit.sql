-- Ember update 002: a "log your food" auto habit. Run after 001, in Supabase → SQL Editor. Safe to run again.
alter table public.habits drop constraint if exists habits_auto_check;
alter table public.habits
  add constraint habits_auto_check check (auto in ('calorie_cap', 'cardio', 'strength', 'food_log'));
