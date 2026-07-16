-- Schema for DLC v2
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- Project: https://supabase.com/dashboard/project/djocdpalpdlauslilxwh

create extension if not exists pgcrypto with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- Products catalogue
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.products (
  ean         text primary key,
  title       text not null,
  brand       text,
  weight      text,
  category    text,
  image_url   text,
  created_at  timestamptz not null default now(),
  constraint products_ean_format check (ean ~ '^[0-9]{8,13}$')
);

create index if not exists products_title_idx    on public.products (title);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_brand_idx    on public.products (brand);

alter table public.products enable row level security;

-- Internal tool policies.
-- The current app is public/no-login, so anon is allowed to read and maintain the
-- catalogue. Tighten these policies when user accounts/roles are added.
drop policy if exists "products_read_anon" on public.products;
create policy "products_read_anon"
  on public.products for select
  to anon, authenticated
  using (true);

drop policy if exists "products_insert_anon" on public.products;
create policy "products_insert_anon"
  on public.products for insert
  to anon, authenticated
  with check (ean ~ '^[0-9]{8,13}$' and title is not null and length(trim(title)) > 0);

drop policy if exists "products_update_anon" on public.products;
create policy "products_update_anon"
  on public.products for update
  to anon, authenticated
  using (true)
  with check (ean ~ '^[0-9]{8,13}$' and title is not null and length(trim(title)) > 0);

drop policy if exists "products_delete_anon" on public.products;
create policy "products_delete_anon"
  on public.products for delete
  to anon, authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Scan history
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.scans (
  id          uuid primary key default gen_random_uuid(),
  ean         text not null,
  scanned_at  timestamptz not null default now(),
  constraint scans_ean_format check (ean ~ '^[0-9]{8,13}$')
);

create index if not exists scans_scanned_at_idx on public.scans (scanned_at desc);
create index if not exists scans_ean_idx        on public.scans (ean);

alter table public.scans enable row level security;

drop policy if exists "scans_read_anon" on public.scans;
create policy "scans_read_anon"
  on public.scans for select
  to anon, authenticated
  using (true);

drop policy if exists "scans_insert_anon" on public.scans;
create policy "scans_insert_anon"
  on public.scans for insert
  to anon, authenticated
  with check (ean ~ '^[0-9]{8,13}$');

-- ─────────────────────────────────────────────────────────────────────────────
-- Optional DLC tracking (cross-device phone scan → desktop review)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.dlc_items (
  id           uuid primary key default gen_random_uuid(),
  ean          text not null,
  title        text not null,
  brand        text,
  weight       text,
  category     text,
  image_url    text,
  expiry_date  date not null,
  quantity     integer not null default 1,
  zone         text,
  note         text,
  status       text not null default 'a_traiter',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint dlc_items_ean_format check (ean ~ '^[0-9]{8,13}$'),
  constraint dlc_items_quantity_positive check (quantity > 0),
  constraint dlc_items_status_check check (status in ('a_traiter', 'fait', 'retire'))
);

create index if not exists dlc_items_expiry_date_idx on public.dlc_items (expiry_date asc);
create index if not exists dlc_items_status_idx      on public.dlc_items (status);
create index if not exists dlc_items_ean_idx         on public.dlc_items (ean);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists dlc_items_set_updated_at on public.dlc_items;
create trigger dlc_items_set_updated_at
  before update on public.dlc_items
  for each row execute function public.set_updated_at();

alter table public.dlc_items enable row level security;

drop policy if exists "dlc_items_read_anon" on public.dlc_items;
create policy "dlc_items_read_anon"
  on public.dlc_items for select
  to anon, authenticated
  using (true);

drop policy if exists "dlc_items_insert_anon" on public.dlc_items;
create policy "dlc_items_insert_anon"
  on public.dlc_items for insert
  to anon, authenticated
  with check (
    ean ~ '^[0-9]{8,13}$'
    and title is not null
    and length(trim(title)) > 0
    and quantity > 0
    and status in ('a_traiter', 'fait', 'retire')
  );

drop policy if exists "dlc_items_update_anon" on public.dlc_items;
create policy "dlc_items_update_anon"
  on public.dlc_items for update
  to anon, authenticated
  using (true)
  with check (
    ean ~ '^[0-9]{8,13}$'
    and title is not null
    and length(trim(title)) > 0
    and quantity > 0
    and status in ('a_traiter', 'fait', 'retire')
  );

drop policy if exists "dlc_items_delete_anon" on public.dlc_items;
create policy "dlc_items_delete_anon"
  on public.dlc_items for delete
  to anon, authenticated
  using (true);

-- ─────────────────────────────────────────────────────────────────────────────
-- Work hours tracking (suivi des heures travaillées, page Heures)
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.work_days (
  day         date primary key,
  -- Array of worked time ranges: [{"start":"06:30","end":"13:00"}, ...]
  -- Empty array = recorded day off (distinct from a missing/unentered day).
  segments    jsonb not null default '[]'::jsonb,
  note        text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint work_days_segments_is_array check (jsonb_typeof(segments) = 'array')
);

create index if not exists work_days_day_idx on public.work_days (day desc);

drop trigger if exists work_days_set_updated_at on public.work_days;
create trigger work_days_set_updated_at
  before update on public.work_days
  for each row execute function public.set_updated_at();

alter table public.work_days enable row level security;

drop policy if exists "work_days_read_anon" on public.work_days;
create policy "work_days_read_anon"
  on public.work_days for select
  to anon, authenticated
  using (true);

drop policy if exists "work_days_insert_anon" on public.work_days;
create policy "work_days_insert_anon"
  on public.work_days for insert
  to anon, authenticated
  with check (jsonb_typeof(segments) = 'array');

drop policy if exists "work_days_update_anon" on public.work_days;
create policy "work_days_update_anon"
  on public.work_days for update
  to anon, authenticated
  using (true)
  with check (jsonb_typeof(segments) = 'array');

drop policy if exists "work_days_delete_anon" on public.work_days;
create policy "work_days_delete_anon"
  on public.work_days for delete
  to anon, authenticated
  using (true);

-- Realtime support for DesktopShell postgres_changes subscription.
-- Safe to re-run: only adds the table if it is not already in the publication.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'scans'
     ) then
    alter publication supabase_realtime add table public.scans;
  end if;
end $$;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1
       from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'dlc_items'
     ) then
    alter publication supabase_realtime add table public.dlc_items;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- Analyses
-- ─────────────────────────────────────────────────────────────────────────────

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
