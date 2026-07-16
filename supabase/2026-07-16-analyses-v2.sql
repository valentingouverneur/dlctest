-- Analyses v2: raw rows + rayon/week identity for upsert & week-over-week comparison.
-- Run in Supabase Dashboard > SQL Editor.

create table if not exists public.analyses (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  file_name     text,
  stats         jsonb,
  total_ca      numeric,
  total_mpaf    numeric,
  total_uvc     integer,
  product_count integer
);

alter table public.analyses
  add column if not exists rows        jsonb,
  add column if not exists rayon       text,
  add column if not exists rayon_code  text,
  add column if not exists week_label  text,
  add column if not exists period_date date,
  add column if not exists total_casse numeric;

-- Upsert identity. NULLs never conflict, so legacy/footer-less rows keep inserting.
create unique index if not exists analyses_rayon_week_idx
  on public.analyses (rayon, week_label);

create index if not exists analyses_period_idx
  on public.analyses (rayon, period_date desc);

alter table public.analyses enable row level security;

drop policy if exists "analyses_all_anon" on public.analyses;
create policy "analyses_all_anon"
  on public.analyses for all
  to anon, authenticated
  using (true) with check (true);
