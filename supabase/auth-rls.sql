-- Resserrement des RLS : accès réservé aux utilisateurs authentifiés.
-- À exécuter dans Supabase SQL Editor APRÈS avoir vérifié que
-- la connexion Google fonctionne (sinon l'app est verrouillée).

-- ── products ──────────────────────────────────────────────────────────
drop policy if exists "products_read_anon"   on public.products;
drop policy if exists "products_insert_anon" on public.products;
drop policy if exists "products_update_anon" on public.products;
drop policy if exists "products_delete_anon" on public.products;

create policy "products_read_authenticated"
  on public.products for select to authenticated using (true);

create policy "products_insert_authenticated"
  on public.products for insert to authenticated
  with check (ean ~ '^[0-9]{8,13}$' and title is not null and length(trim(title)) > 0);

create policy "products_update_authenticated"
  on public.products for update to authenticated
  using (true)
  with check (ean ~ '^[0-9]{8,13}$' and title is not null and length(trim(title)) > 0);

create policy "products_delete_authenticated"
  on public.products for delete to authenticated using (true);

-- ── scans ─────────────────────────────────────────────────────────────
drop policy if exists "scans_read_anon"   on public.scans;
drop policy if exists "scans_insert_anon" on public.scans;

create policy "scans_read_authenticated"
  on public.scans for select to authenticated using (true);

create policy "scans_insert_authenticated"
  on public.scans for insert to authenticated
  with check (ean ~ '^[0-9]{8,13}$');

-- ── dlc_items ─────────────────────────────────────────────────────────
drop policy if exists "dlc_items_read_anon"   on public.dlc_items;
drop policy if exists "dlc_items_insert_anon" on public.dlc_items;
drop policy if exists "dlc_items_update_anon" on public.dlc_items;
drop policy if exists "dlc_items_delete_anon" on public.dlc_items;

create policy "dlc_items_read_authenticated"
  on public.dlc_items for select to authenticated using (true);

create policy "dlc_items_insert_authenticated"
  on public.dlc_items for insert to authenticated
  with check (
    ean ~ '^[0-9]{8,13}$' and title is not null and length(trim(title)) > 0
    and quantity > 0 and status in ('a_traiter', 'fait', 'retire')
  );

create policy "dlc_items_update_authenticated"
  on public.dlc_items for update to authenticated
  using (true)
  with check (
    ean ~ '^[0-9]{8,13}$' and title is not null and length(trim(title)) > 0
    and quantity > 0 and status in ('a_traiter', 'fait', 'retire')
  );

create policy "dlc_items_delete_authenticated"
  on public.dlc_items for delete to authenticated using (true);

-- ── work_days ─────────────────────────────────────────────────────────
drop policy if exists "work_days_read_anon"   on public.work_days;
drop policy if exists "work_days_insert_anon" on public.work_days;
drop policy if exists "work_days_update_anon" on public.work_days;
drop policy if exists "work_days_delete_anon" on public.work_days;

create policy "work_days_read_authenticated"
  on public.work_days for select to authenticated using (true);

create policy "work_days_insert_authenticated"
  on public.work_days for insert to authenticated
  with check (jsonb_typeof(segments) = 'array');

create policy "work_days_update_authenticated"
  on public.work_days for update to authenticated
  using (true) with check (jsonb_typeof(segments) = 'array');

create policy "work_days_delete_authenticated"
  on public.work_days for delete to authenticated using (true);

-- ── analyses ──────────────────────────────────────────────────────────
drop policy if exists "analyses_all_anon" on public.analyses;

create policy "analyses_all_authenticated"
  on public.analyses for all to authenticated
  using (true) with check (true);
