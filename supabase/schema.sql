-- Run in Supabase SQL Editor (or via CLI migrations)

create table if not exists public.entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  year int not null,
  month int not null check (month >= 1 and month <= 12),
  matty_w2 numeric,
  matty_1099 numeric,
  matty_other numeric,
  kara_w2 numeric,
  kara_other numeric,
  income_net numeric,
  exp_home numeric,
  exp_food numeric,
  exp_travel numeric,
  exp_fun numeric,
  exp_gifts numeric,
  exp_transport numeric,
  exp_shopping numeric,
  exp_selfcare numeric,
  exp_loans numeric,
  exp_student_loans numeric,
  exp_taxes numeric,
  sav_btc numeric,
  sav_ira numeric,
  sav_fund numeric,
  asset_cash numeric,
  asset_btc numeric,
  asset_equities numeric,
  asset_retirement numeric,
  asset_other numeric,
  liab_credit_cards numeric,
  liab_student_loan numeric,
  liab_other_loans numeric,
  unique (user_id, year, month)
);

alter table public.entries enable row level security;

create policy "Users read own entries"
  on public.entries for select
  using (auth.uid() = user_id);

create policy "Users insert own entries"
  on public.entries for insert
  with check (auth.uid() = user_id);

create policy "Users update own entries"
  on public.entries for update
  using (auth.uid() = user_id);

create policy "Users delete own entries"
  on public.entries for delete
  using (auth.uid() = user_id);

create index if not exists entries_user_year_month_idx
  on public.entries (user_id, year, month);
