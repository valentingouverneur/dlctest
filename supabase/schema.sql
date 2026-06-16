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
