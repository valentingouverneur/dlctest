# Supabase setup

## 1. Run the schema

1. Go to your Supabase project → **SQL Editor** → **New query**
2. Paste the content of `schema.sql`
3. Click **Run**

This creates the `products` table with public read access.

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
```

Should return ~1703.
