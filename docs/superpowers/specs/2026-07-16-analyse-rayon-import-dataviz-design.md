# Analyse rayon — direct Infomil import, auto-save, week comparison, dataviz

Date: 2026-07-16

## Problem

The "Analyse rayon" page (`src/pages/Analyse.jsx`) ingests a weekly sales
CSV exported from the store's Infomil back office. Three problems today:

1. **Manual normalization step.** The raw export wraps EANs in Excel's
   text-protection syntax (`"=""3017809486017"""`) and the current parser
   rejects those rows (`^\d{8,}` regex fails), so the user pastes the file
   through Claude chat to normalize it before every import.
2. **Fragile column handling.** The parser reads columns by fixed index
   (`cols[3]`, `cols[5]`…). The Infomil stat template is configured by
   hand each time; when the user forgets to tick some indicators, the CSV
   has fewer columns and every value silently lands in the wrong field.
3. **Save flow is broken and lossy.** On mount the page auto-loads the
   most recent saved analysis and sets `savedId`; dropping a new file does
   not reset `savedId`, so the header shows "✓ Sauvegardée" and the save
   button never appears (observed: imported s28, nothing to save, reload
   showed s26). Unsaved imports live only in React state and are lost on
   reload. Saved analyses also only store aggregated tops — not the
   product rows — so no week-over-week comparison is possible.

Additionally, the analysis results are table-only; the user wants better
data visualization for four concrete uses: deciding which refs to
add/remove, tracking week-over-week evolution, steering shrinkage
("casse"), and reporting to management.

Reference file: `C:\Users\valentin\Downloads\s28.csv` (1 146 lines,
UTF-8 BOM, `;`-separated). Verified structure:

- Header row: `EAN;Désignation;Rattachement;CA TTC;…;DATE VALIDITE`
  (27 columns in this export; the set varies per export).
- Data rows: EAN as `"=""<digits>"""`, decimal point numbers, many
  empty optional columns.
- **Totals row**: empty EAN, sums in the numeric columns
  (e.g. CA TTC 78432.68, MPAF 18337.31, UVC 21678, Casse PAF 262.07).
- **Footer metadata** (after totals):
  `Modèle: Statistiques sur une période - Articles`, `Filtre :`,
  `Structure marchandise magasin : Liste éléments rayon : 0013 SURGELES`,
  `Exporté le 13/07/26 09:52:12`.

## Decisions

- **Client-side deterministic parser** (no server function, no LLM). The
  format is fixed; a robust parser removes the Claude normalization step
  entirely. Flow becomes: export → drag-and-drop → done.
- **Column mapping by header name** with an alias table, not by index.
  Missing columns are reported, dependent UI sections are hidden with a
  note — never fake zeros.
- **Auto-save on import with upsert on `(rayon, week_label)`.** No save
  button to forget. Re-importing the same week/rayon replaces the
  previous record (corrected exports). If the save fails (offline, table
  missing), the analysis stays usable in memory with a
  "⚠ Non sauvegardée — réessayer" banner.
- **Rayon is a first-class dimension.** The user analyzes multiple
  rayons; rayon is parsed from the footer, stored, shown in the history
  list, and week-over-week comparison only compares analyses of the same
  rayon.
- **Full product rows saved as JSONB** in the existing `analyses` table
  (~1 150 rows ≈ 250 KB per analysis) rather than a relational
  `analysis_rows` table — simpler, and comparisons load at most two
  analyses client-side. Revisit if per-EAN SQL queries across weeks are
  ever needed.
- **Hand-rolled SVG charts** matching the app's custom design tokens —
  no chart library dependency. Five components, listed below.
- The Infomil export and the moment of analysis remain manual (workplace
  constraint); only everything after "file lands on disk" is automated.

## Design

### 1. Parser — new module `src/lib/infomil.js`

`parseInfomilCsv(text)` → `{ rows, columns, totals, meta, integrity }`
or `{ error }`.

- **CSV mechanics:** strip BOM; split lines; parse each line with a
  quote-aware field splitter (`;` delimiter, `""` escapes). EAN fields
  `="<digits>"` are unwrapped to the bare digit string.
- **Header detection:** first line whose first field is `EAN`. Column
  positions are resolved from header names through an alias map:
  `ean` ← `EAN`; `designation` ← `Désignation`; `ca_ttc` ← `CA TTC`;
  `uvc` ← `UVC`; `mpaf_ht_pct` ← `MPAF HT(%)`; `mpaf` ← `MPAF`;
  `freq` ← `Fréq`; `panier` ← `Panier`; `casse_paf` ← `Casse PAF`;
  `casse_uvc` ← `Casse(UVC)`. Matching is exact on the trimmed header
  cell (`MPAF` must not match `MPAF HT(%)` or `MPAF TTC(%)` — resolve by
  exact name, not substring). `columns` returns
  `{ found: [...], missing: [...] }` over that canonical set.
- **Required vs optional:** `ean`, `designation`, `ca_ttc`, `uvc` are
  required — if any is missing, return `{ error }` naming the missing
  columns. All others are optional; absent values parse as `null` (not
  0) so downstream code can distinguish "no data" from "zero".
- **Data rows:** rows whose unwrapped EAN is 8+ digits. Numbers use `.`
  decimals; empty cells → `null` for optional metrics, 0 only where the
  column exists and the cell is genuinely `0`.
- **Totals row:** the row after the data block with an empty EAN and
  numeric sums. Captured into `totals` (same canonical keys).
  `integrity` compares computed sums of `ca_ttc`, `mpaf`, `uvc` (those
  of them whose columns exist) against `totals` with a small tolerance
  (0.5 % or 1 unit): `{ ok: boolean, deltas: {...} }`.
- **Footer:** scan trailing non-data lines for
  `Liste éléments rayon : <code> <NAME>` → `meta.rayonCode` ("0013"),
  `meta.rayon` ("SURGELES"); `Exporté le <dd/MM/yy HH:mm:ss>` →
  `meta.exportedAt` (Date). `meta.week` = ISO week number of
  `exportedAt`; `meta.label` = `"S28 · Surgelés"` (week + title-cased
  rayon). If the footer is absent, `meta` fields are `null` and the
  file name is used as the label — import still succeeds.

### 2. Storage — `src/lib/analyses.js` + Supabase migration

Migration SQL (run manually in the Supabase dashboard, same pattern as
the existing `TABLE_MISSING` flow; SQL included in the plan):

```sql
alter table analyses
  add column if not exists rows jsonb,
  add column if not exists rayon text,
  add column if not exists rayon_code text,
  add column if not exists week_label text,
  add column if not exists period_date date;
create unique index if not exists analyses_rayon_week
  on analyses (rayon, week_label);
```

- `saveAnalysis` becomes an **upsert** on `(rayon, week_label)` (falls
  back to plain insert when `rayon`/`week_label` are null, i.e. footer
  missing). Payload adds `rows` (the parsed product rows), `rayon`,
  `rayon_code`, `week_label`, `period_date` (export date).
- New `getPreviousAnalysis(rayon, beforeDate)` — most recent analysis
  with the same `rayon` and `period_date < beforeDate`, used by the
  comparison view and KPI deltas.
- New `listAnalyses` keeps returning summaries, now including `rayon`
  and `week_label` for display/filtering.
- Legacy rows (no `rows`, no `rayon`) still load and render; they are
  simply never candidates for comparison, and the comparison tab shows
  "pas de semaine précédente comparable pour ce rayon".

### 3. Charts — new `src/components/charts/`

All hand-rolled SVG (viewBox-scaled, responsive, design-token colors,
`var(--font-mono)` numerals). The dataviz skill governs visual details
at implementation time.

- **`Sparkline`** — tiny line for a metric across the saved weeks of the
  current rayon (chronological by `period_date`).
- **`KpiTile`** — label, current value, delta vs previous week
  (▲/▼ + %), embedded `Sparkline`. Replaces the current `StatCard` row.
  Tiles: CA TTC, Marge € (MPAF), Marge %, UVC, Casse € (casse tile
  hidden if column absent).
- **`ScatterQuadrant`** — x = marge % (`mpaf_ht_pct`), y = CA TTC on a
  square-root scale (keeps the long tail of small refs readable), point
  radius ∝ UVC. Quadrant guides at the star thresholds (CA 300 €,
  marge 20 %). Hover tooltip (désignation, CA, marge, UVC); click →
  `onSelectEan`.
- **`ParetoCurve`** — refs sorted by CA desc, cumulative CA % curve,
  with a marker line at 80 % ("N réfs font 80 % du CA").
- **`DeltaBars`** — horizontal diverging bars of CA delta per product
  vs previous week (top ~10 gainers, top ~10 losers).

### 4. Page — `src/pages/Analyse.jsx`

- **Import flow:** drop file → `parseInfomilCsv` → compute stats →
  render → auto-save (upsert) → update history state. All save state
  (`savedId`, errors) is reset on every new file, and the manual save
  button is removed — which eliminates the stale-`savedId` bug. Header
  shows save status: "✓ S28 · Surgelés enregistrée" or the retry banner.
- **Import report card** shown above the tabs after an import:
  ref count, columns found/missing ("Casse absente de cet export"),
  integrity check result (✓ totaux conformes / ⚠ écart: …). Dismissible.
- **Header:** permanent analysis switcher (dropdown or chips) listing
  saved analyses as "S28 · Surgelés", filterable by rayon — replaces the
  buried "Analyses sauvegardées" sub-screen as the primary navigation
  (the sub-screen may remain for deletion/management).
- **Tabs:**
  - *Vue d'ensemble*: KPI tiles (with sparklines/deltas when history
    exists) → `ScatterQuadrant` → `ParetoCurve` → existing stars/risky/
    casse/zeros sections.
  - *Comparaison* (new): vs previous week same rayon — `DeltaBars`,
    plus lists of refs that appeared/disappeared between the two
    exports. Empty state when no comparable previous week.
  - *Casse*: casse-%-of-CA trend line (across saved weeks) above the
    existing table. Tab hidden entirely when casse columns are absent.
  - *Top ventes*, *Produits star*, *À risque*: unchanged tables.
- Sections/tabs depending on missing columns are hidden with a one-line
  note, never rendered with fake zeros.

### 5. Error handling

- Unrecognized file (no `EAN` header): clear error, no state change.
- Missing required columns: import refused, message lists them.
- Totals mismatch: non-blocking warning in the import report.
- Save failure: analysis stays in memory, banner with a retry button;
  `TABLE_MISSING` keeps its guided message (now pointing at the new
  migration SQL).
- No comparable previous week: informative empty state, not an error.

### 6. Testing

Manual, in-browser (project has no test runner):

- Import raw `s28.csv` → numbers match the file's own totals row
  (CA 78 432,68 €; MPAF 18 337,31 €; UVC 21 678; casse 262,07 €),
  label "S28 · Surgelés", integrity ✓.
- Import a truncated copy with columns removed (e.g. delete the casse
  columns) → import succeeds, report lists missing columns, casse tab
  hidden.
- Import the same file twice → single row in Supabase (upsert), no
  duplicate in history.
- Import with Supabase creds removed → retry banner, analysis usable.
- Save s26-style second week for the same rayon → sparklines, KPI
  deltas and Comparaison tab populate.

## Out of scope

- Automating the Infomil export itself (workplace constraint).
- Relational `analysis_rows` table / cross-week SQL analytics.
- PDF/print export for management reporting (the Vue d'ensemble screen
  is the report for now).
- Multi-store or multi-user concerns.
