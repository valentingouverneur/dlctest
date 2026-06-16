# Supabase setup

Project: https://supabase.com/dashboard/project/djocdpalpdlauslilxwh

## 1. Run the schema

1. Go to your Supabase project → **SQL Editor** → **New query**
2. Paste the content of `schema.sql`
3. Click **Run**

This creates/updates:

- `products` catalogue table
- `scans` scan-history table
- indexes used by catalogue/search/history
- RLS policies for the current no-login internal app
- Realtime publication for `scans`, used by the desktop view

> The current app is public/no-login. The schema intentionally allows `anon` to read/write the internal catalogue and insert scans. Tighten these policies when user accounts/roles are added.

## 2. Import the CSV

Two options.

### Option A — Dashboard (easiest, one-time)

1. Go to **Table Editor** → select `products` table
2. Click **Insert** → **Import data from CSV**
3. Upload `catalogue-articles-2026-04-27.csv`
4. **Important:** the CSV uses `;` as separator, not `,`. Open it in a spreadsheet (Numbers / Excel / Google Sheets), re-export as standard CSV with `,` separator. Or use option B below.
5. Map columns:
   - `EAN` → `ean`
   - `Titre` → `title`
   - `Marque` → `brand`
   - `Poids` → `weight`
   - `Catégorie` → `category`
6. Click **Import**

### Option B — psql / SQL `\copy` (handles `;` separator natively)

Get your connection string from **Settings** → **Database** → **Connection string** → **psql**.

```bash
psql "your-connection-string"
```

Then in psql:

```sql
\copy public.products(ean, title, brand, weight, category) FROM 'catalogue-articles-2026-04-27.csv' WITH (FORMAT csv, HEADER true, DELIMITER ';');
```

## 3. Verify

In SQL Editor, run:

```sql
select count(*) from products;
select count(*) from scans;
```

The current project has hundreds of products and existing scan history. The app should show the catalogue without console errors.
