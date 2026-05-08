-- Schema for DLC v2
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query)

create table if not exists public.products (
  ean         text primary key,
  title       text not null,
  brand       text,
  weight      text,
  category    text,
  image_url   text,
  created_at  timestamptz default now()
);

create index if not exists products_title_idx    on public.products (title);
create index if not exists products_category_idx on public.products (category);
create index if not exists products_brand_idx    on public.products (brand);

-- Read-only public access for the internal tool.
-- Adjust to your needs (e.g. require auth) once you add user accounts.
alter table public.products enable row level security;

drop policy if exists "products_read_anon" on public.products;
create policy "products_read_anon"
  on public.products for select
  to anon, authenticated
  using (true);
