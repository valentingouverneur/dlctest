# Analyse Rayon — Infomil Import + Dataviz Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import raw Infomil CSV exports directly (no manual normalization), auto-save analyses to Supabase with upsert by (rayon, week), and add five hand-rolled SVG visualizations including week-over-week comparison.

**Architecture:** A pure client-side parser (`lib/infomil.js`) maps columns by header name and extracts totals/footer metadata. Stats computation moves to `lib/analyseStats.js` (recomputed from raw rows on load). `lib/analyses.js` gains upsert + previous-week lookup; raw rows are stored as JSONB. Five SVG chart components in `src/components/charts/` feed a reworked `Analyse.jsx`.

**Tech Stack:** React 18, Vite, Supabase JS v2, plain JavaScript (no TypeScript), inline-style CSS-in-JS with design tokens. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-16-analyse-rayon-import-dataviz-design.md`

## Global Constraints

- **No new npm dependencies.** Charts are hand-rolled SVG.
- **No test runner in the project.** The parser and stats are verified by a plain Node script (`node scripts/check-infomil.mjs`, exits non-zero on failure — `package.json` has `"type": "module"` so ESM imports work). UI is verified with `npm run build` + manual browser checks.
- **All UI text is French.**
- **Design tokens only** (from `src/styles.css`): surfaces `--canvas` #ffffff / `--surface`, text `--charcoal`/`--steel`/`--stone`, lines `--hairline` #e5e3df / `--hairline-strong`, accent `--primary` #5645d4, status `--success` #1aae39 / `--error` #e03131 / `--warning` #dd5b00, tints `--tint-mint`/`--tint-rose`/`--tint-lavender`/`--tint-gray`, fonts `--font-sans`/`--font-mono`.
- **Dataviz rules (validated):** single-series marks use `--primary` (contrast 6.57:1 on white — PASS). Delta polarity uses `--success`/`--error`; green is 2.93:1 (sub-3:1) so **every delta bar carries a visible direct value label** — non-negotiable. Lines 2px round cap/join; bars ≤24px thick with 4px rounded data-end and square baseline; markers r ≥ 4 with a 2px `--canvas` ring; gridlines 1px solid `--hairline` (never dashed); all text wears text tokens, never series color (exception: signed delta values may wear status color since they pair with ▲/▼ arrows); no legend for single-series charts; hover tooltips on scatter and pareto.
- Numbers display French-style: existing `money()` format (`1 234.56 €` with thin-space thousands), percentages with comma decimals.
- Commit after every task.

---

### Task 1: Infomil CSV parser (`lib/infomil.js`) + Node check script

**Files:**
- Create: `src/lib/infomil.js`
- Create: `fixtures/infomil-sample.csv`
- Create: `scripts/check-infomil.mjs`

**Interfaces:**
- Consumes: nothing (pure module, zero imports).
- Produces:
  - `parseInfomilCsv(text) → { rows, columns, totals, meta, integrity } | { error: string }`
    - `rows`: `[{ ean: string, designation: string, ca_ttc: number|null, uvc: number|null, mpaf_ht_pct: number|null, mpaf: number|null, freq: number|null, panier: number|null, casse_paf: number|null, casse_uvc: number|null }]` — a metric is `null` when its column is absent OR its cell is empty.
    - `columns`: `{ found: string[], missing: string[] }` over the canonical keys above.
    - `totals`: same canonical numeric keys from the file's totals row, or `null` if no totals row.
    - `meta`: `{ rayon: string|null, rayonCode: string|null, exportedAt: Date|null }`.
    - `integrity`: `{ ok: boolean, deltas: { [key]: { computed, official } } }` — comparison of computed sums vs totals row for `ca_ttc`, `mpaf`, `uvc` (only for found columns; tolerance `max(1, 0.5% of official)`); `{ ok: true, deltas: {} }` when no totals row.
  - `deriveWeek(fileName, meta) → { num: number, key: string } | null` — week number from filename `s28.csv` pattern first, else ISO week of `exportedAt − 1 day`; `key` is `"2026-S28"`.
  - `buildLabel(week, meta, fileName) → string` — `"S28 · Surgeles"` (title-cased rayon), falls back to `fileName`.
  - `COLUMN_LABELS`: `{ [canonicalKey]: 'French display name' }` for the import report.

- [ ] **Step 1: Create the fixture**

Create `fixtures/infomil-sample.csv` with exactly this content (semicolon-separated, mirrors the real 27-column Infomil export — header verbatim, 3 data rows, totals row, footer). Save as UTF-8:

```csv
EAN;Désignation;Rattachement;CA TTC;CA TTC Prosp(%);UVC;MPAF HT(%);CA TTC Prosp;CA(%);CA(%) niv;Fréq;Panier;UVC prosp;Qté;Qté prosp;MPAF;MPAF TTC(%);MPAF prosp;MPAF prosp TTC(%);Pds MPAF(%);Pds MPAF(%) niv;Casse PAF;Casse P3N;Casse PAF(%);Casse P3N(%);Casse(UVC);DATE VALIDITE
"=""3000000000017""";PRODUIT ALPHA 500G;Aucun;100.00;;10;20.0;;;;8;12.50;;10;;20.00;19.0;;;;;;;;;;13/07/26 00:00:00
"=""3000000000024""";PRODUIT BETA 1KG;Aucun;50.00;;5;30.0;;;;5;10.00;;5;;15.00;28.5;;;;;1.50;1.40;1.5;1.4;2;13/07/26 00:00:00
"=""3000000000031""";PRODUIT GAMMA 250G;Aucun;0.00;;0;;;;;0;;;0;;0.00;;;;;;;;;;;13/07/26 00:00:00
;;;150.00;;15;23.3;;;;;;;15;;35.00;22.1;;;;;1.50;1.40;;;2;
Modèle: Statistiques sur une période - Articles
Filtre : 
Structure marchandise magasin : Liste éléments rayon : 0013 SURGELES
Exporté le 13/07/26 09:52:12
```

- [ ] **Step 2: Write the check script (the failing test)**

Create `scripts/check-infomil.mjs`:

```js
// Verification for lib/infomil.js — run: node scripts/check-infomil.mjs
import { readFileSync } from 'node:fs';
import { parseInfomilCsv, deriveWeek, buildLabel } from '../src/lib/infomil.js';

let failures = 0;
function check(label, actual, expected) {
  const a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a === e) { console.log('  ok  ' + label); }
  else { failures++; console.error('FAIL  ' + label + '\n      expected ' + e + '\n      got      ' + a); }
}

const text = readFileSync(new URL('../fixtures/infomil-sample.csv', import.meta.url), 'utf8');
const p = parseInfomilCsv(text);

check('no parse error', p.error, undefined);
check('row count', p.rows.length, 3);
check('ean unwrapped', p.rows[0].ean, '3000000000017');
check('designation', p.rows[0].designation, 'PRODUIT ALPHA 500G');
check('ca_ttc', p.rows[0].ca_ttc, 100);
check('uvc', p.rows[0].uvc, 10);
check('mpaf_ht_pct', p.rows[0].mpaf_ht_pct, 20);
check('freq (col 10, was swapped with panier in old parser)', p.rows[0].freq, 8);
check('panier (col 11)', p.rows[0].panier, 12.5);
check('mpaf', p.rows[0].mpaf, 20);
check('casse_paf on beta', p.rows[1].casse_paf, 1.5);
check('casse_uvc on beta', p.rows[1].casse_uvc, 2);
check('empty cell -> null (gamma mpaf_ht_pct)', p.rows[2].mpaf_ht_pct, null);
check('all canonical columns found', p.columns.missing, []);
check('totals ca_ttc', p.totals.ca_ttc, 150);
check('totals uvc', p.totals.uvc, 15);
check('totals mpaf', p.totals.mpaf, 35);
check('integrity ok', p.integrity.ok, true);
check('meta rayon', p.meta.rayon, 'SURGELES');
check('meta rayonCode', p.meta.rayonCode, '0013');
check('meta exportedAt', p.meta.exportedAt && p.meta.exportedAt.toISOString().slice(0, 10), '2026-07-13');

// Week derivation: from export date (Monday 13/07/2026 minus 1 day = Sunday of ISO week 28)
check('week from date', deriveWeek('fixture.csv', p.meta), { num: 28, key: '2026-S28' });
// Filename takes priority
check('week from filename', deriveWeek('s30.csv', p.meta), { num: 30, key: '2026-S30' });
check('label', buildLabel(deriveWeek('s28.csv', p.meta), p.meta, 's28.csv'), 'S28 · Surgeles');
check('label fallback', buildLabel(null, { rayon: null, rayonCode: null, exportedAt: null }, 'x.csv'), 'x.csv');

// Missing optional columns: header without Fréq/Panier/casse columns
const noCasse = [
  'EAN;Désignation;CA TTC;UVC;MPAF HT(%);MPAF',
  '"=""3000000000017""";PRODUIT ALPHA 500G;100.00;10;20.0;20.00',
].join('\n');
const p2 = parseInfomilCsv(noCasse);
check('optional missing listed', p2.columns.missing.sort(), ['casse_paf', 'casse_uvc', 'freq', 'panier']);
check('missing column -> null', p2.rows[0].freq, null);
check('no totals row -> integrity ok', p2.integrity.ok, true);
check('no footer -> meta nulls', p2.meta, { rayon: null, rayonCode: null, exportedAt: null });

// Missing required column -> error
const noUvc = 'EAN;Désignation;CA TTC\n"=""3000000000017""";X;1.00';
check('required missing -> error', !!parseInfomilCsv(noUvc).error, true);
check('error names the column', parseInfomilCsv(noUvc).error.includes('UVC'), true);

// Already-normalized EAN (plain digits, no ="" wrapper) still parses
const plain = 'EAN;Désignation;CA TTC;UVC\n3000000000017;X;1.00;1';
check('plain ean accepted', parseInfomilCsv(plain).rows[0].ean, '3000000000017');

// Unrecognized file
check('garbage -> error', !!parseInfomilCsv('hello\nworld').error, true);

console.log(failures === 0 ? '\nALL CHECKS PASSED' : '\n' + failures + ' FAILURE(S)');
process.exit(failures === 0 ? 0 : 1);
```

- [ ] **Step 3: Run to verify it fails**

Run: `node scripts/check-infomil.mjs`
Expected: FAIL — `Cannot find module '../src/lib/infomil.js'`

- [ ] **Step 4: Implement the parser**

Create `src/lib/infomil.js`:

```js
// Parser for raw Infomil "Statistiques sur une période - Articles" CSV exports.
// Pure module (no imports) so it can be verified in Node: scripts/check-infomil.mjs

const COLUMN_ALIASES = {
  ean: ['EAN'],
  designation: ['Désignation', 'Designation'],
  ca_ttc: ['CA TTC'],
  uvc: ['UVC'],
  mpaf_ht_pct: ['MPAF HT(%)'],
  mpaf: ['MPAF'],
  freq: ['Fréq', 'Freq'],
  panier: ['Panier'],
  casse_paf: ['Casse PAF'],
  casse_uvc: ['Casse(UVC)'],
};

export const COLUMN_LABELS = {
  ean: 'EAN', designation: 'Désignation', ca_ttc: 'CA TTC', uvc: 'UVC',
  mpaf_ht_pct: 'MPAF HT(%)', mpaf: 'MPAF', freq: 'Fréq', panier: 'Panier',
  casse_paf: 'Casse PAF', casse_uvc: 'Casse (UVC)',
};

const REQUIRED = ['ean', 'designation', 'ca_ttc', 'uvc'];
const INT_KEYS = new Set(['uvc', 'freq', 'casse_uvc']);
const TOTAL_KEYS = ['ca_ttc', 'uvc', 'mpaf'];

// Quote-aware split of one CSV line on ';' ("" is an escaped quote).
function splitLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ';') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// '="3017809486017"' (Excel text protection) or plain '3017809486017' -> digits.
function unwrapEan(field) {
  const m = (field || '').trim().match(/^(?:="?)?(\d+)"?$/);
  return m ? m[1] : null;
}

function parseNum(field, isInt) {
  const s = (field || '').trim();
  if (s === '') return null;
  const v = isInt ? parseInt(s, 10) : parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { num: Math.ceil(((d - yearStart) / 86400000 + 1) / 7), year: d.getUTCFullYear() };
}

export function parseInfomilCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // UTF-8 BOM
  const lines = text.split(/\r?\n/);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (splitLine(lines[i])[0].trim() === 'EAN') { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { error: 'Format non reconnu : en-tête "EAN" introuvable. Dépose l’export Infomil brut (Statistiques sur une période).' };

  const header = splitLine(lines[headerIdx]).map(h => h.trim());
  const idx = {};
  const found = [], missing = [];
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    const at = header.findIndex(h => aliases.includes(h));
    if (at === -1) missing.push(key); else { idx[key] = at; found.push(key); }
  }
  const missingRequired = REQUIRED.filter(k => missing.includes(k));
  if (missingRequired.length > 0) {
    return { error: 'Colonnes obligatoires absentes : ' + missingRequired.map(k => COLUMN_LABELS[k]).join(', ') + '. Ajoute-les au modèle de stats Infomil.' };
  }

  const rows = [];
  let totals = null;
  const meta = { rayon: null, rayonCode: null, exportedAt: null };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const rayonMatch = line.match(/Liste éléments rayon\s*:\s*(\d+)\s+(.+?)\s*$/);
    if (rayonMatch) { meta.rayonCode = rayonMatch[1]; meta.rayon = rayonMatch[2]; continue; }
    const dateMatch = line.match(/Exporté le (\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (dateMatch) {
      const [, dd, mm, yy, h, mn, s] = dateMatch.map(Number);
      meta.exportedAt = new Date(2000 + yy, mm - 1, dd, h, mn, s);
      continue;
    }

    const fields = splitLine(line);
    const ean = unwrapEan(fields[idx.ean]);
    if (ean && ean.length >= 8) {
      const row = { ean, designation: (fields[idx.designation] || '').trim() };
      for (const key of Object.keys(COLUMN_ALIASES)) {
        if (key === 'ean' || key === 'designation') continue;
        row[key] = key in idx ? parseNum(fields[idx[key]], INT_KEYS.has(key)) : null;
      }
      rows.push(row);
    } else if (!totals && rows.length > 0 && 'ca_ttc' in idx && parseNum(fields[idx.ca_ttc]) != null) {
      // Totals row: no EAN, but numeric sums in the metric columns.
      totals = {};
      for (const key of Object.keys(COLUMN_ALIASES)) {
        if (key === 'ean' || key === 'designation') continue;
        totals[key] = key in idx ? parseNum(fields[idx[key]], INT_KEYS.has(key)) : null;
      }
    }
  }

  if (rows.length === 0) return { error: 'Aucune ligne produit trouvée dans le fichier.' };

  const integrity = { ok: true, deltas: {} };
  if (totals) {
    for (const key of TOTAL_KEYS) {
      if (!(key in idx) || totals[key] == null) continue;
      const computed = rows.reduce((s, r) => s + (r[key] || 0), 0);
      const official = totals[key];
      if (Math.abs(computed - official) > Math.max(1, Math.abs(official) * 0.005)) {
        integrity.ok = false;
        integrity.deltas[key] = { computed: Math.round(computed * 100) / 100, official };
      }
    }
  }

  return { rows, columns: { found, missing }, totals, meta, integrity };
}

// Week from the file name ("s28.csv") first — the user names exports by week —
// else ISO week of (export date − 1 day): exports happen just after the week closes.
export function deriveWeek(fileName, meta) {
  const m = (fileName || '').match(/(?:^|[^a-z0-9])s(\d{1,2})(?![0-9])/i);
  if (m) {
    const year = meta.exportedAt ? isoWeek(meta.exportedAt).year : new Date().getFullYear();
    const num = parseInt(m[1], 10);
    return { num, key: year + '-S' + String(num).padStart(2, '0') };
  }
  if (meta.exportedAt) {
    const w = isoWeek(new Date(meta.exportedAt.getTime() - 86400000));
    return { num: w.num, key: w.year + '-S' + String(w.num).padStart(2, '0') };
  }
  return null;
}

export function titleCase(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function buildLabel(week, meta, fileName) {
  const parts = [];
  if (week) parts.push('S' + week.num);
  if (meta.rayon) parts.push(titleCase(meta.rayon));
  return parts.length > 0 ? parts.join(' · ') : fileName;
}
```

- [ ] **Step 5: Run the check script until it passes**

Run: `node scripts/check-infomil.mjs`
Expected: `ALL CHECKS PASSED`, exit 0.

- [ ] **Step 6: Sanity-check against the real export (if present)**

Run: `node -e "import('./src/lib/infomil.js').then(async m => { const fs = await import('node:fs'); const p = m.parseInfomilCsv(fs.readFileSync('C:/Users/valentin/Downloads/s28.csv', 'utf8')); console.log('rows', p.rows.length, 'integrity', p.integrity, 'meta', p.meta, 'missing', p.columns.missing); })"`
Expected (if the file exists): ~1140 rows, `integrity.ok: true`, rayon `SURGELES`, no missing columns. Skip without failing if the file is gone.

- [ ] **Step 7: Commit**

```bash
git add src/lib/infomil.js fixtures/infomil-sample.csv scripts/check-infomil.mjs
git commit -m "feat: add Infomil CSV parser with header-name column mapping"
```

---

### Task 2: Stats computation module (`lib/analyseStats.js`)

**Files:**
- Create: `src/lib/analyseStats.js`
- Modify: `scripts/check-infomil.mjs` (append checks)

**Interfaces:**
- Consumes: parser row shape from Task 1 (`{ ean, designation, ca_ttc, uvc, mpaf_ht_pct, mpaf, freq, panier, casse_paf, casse_uvc }`, metrics nullable).
- Produces:
  - `computeStats(rows) → { total, totalMpaf, totalUvc, totalCasse, count, topCa, topMpaf, topEff, stars, risky, zeros, casse }` — same aggregate shape the page uses today, plus `totalCasse`, with `count` replacing the old confusing `stats.rows`.
  - `inferColumns(rows) → { found, missing }` — for saved analyses loaded from Supabase (which store rows but not the columns report): a key is "found" if any row has a non-null value.
  - Re-exports `riskScore(p)`, `efficiency(p)`, `isStar(p)` (moved out of `Analyse.jsx`, made null-tolerant).

- [ ] **Step 1: Append failing checks to the check script**

Append to `scripts/check-infomil.mjs`, just before the final `console.log(failures === 0 ...)` line:

```js
// ---- analyseStats ----
const { computeStats, inferColumns } = await import('../src/lib/analyseStats.js');
const s = computeStats(p.rows);
check('stats total', s.total, 150);
check('stats totalMpaf', s.totalMpaf, 35);
check('stats totalUvc', s.totalUvc, 15);
check('stats totalCasse', s.totalCasse, 1.5);
check('stats count', s.count, 3);
check('zeros = gamma', s.zeros.map(r => r.ean), ['3000000000031']);
check('casse list = beta', s.casse.map(r => r.ean), ['3000000000024']);
check('topCa order', s.topCa.map(r => r.ean), ['3000000000017', '3000000000024', '3000000000031']);
check('stars empty (no CA > 300)', s.stars.length, 0);
check('risky excludes uvc=0', s.risky.every(r => r.uvc > 0), true);
const inferred = inferColumns(p2.rows);
check('inferColumns missing', inferred.missing.sort(), ['casse_paf', 'casse_uvc', 'freq', 'panier']);
check('computeStats on null-metric rows does not throw', computeStats(p2.rows).total, 100);
```

- [ ] **Step 2: Run to verify it fails**

Run: `node scripts/check-infomil.mjs`
Expected: FAIL — `Cannot find module '../src/lib/analyseStats.js'`

- [ ] **Step 3: Implement**

Create `src/lib/analyseStats.js`:

```js
// Derived analytics over parsed Infomil rows. Null-tolerant: any metric can be null
// when its column was absent from the export. Pure module (Node-verifiable).

export function riskScore(p) {
  if (!p.uvc) return -Infinity;
  return ((p.ca_ttc || 0) / p.uvc) * ((p.mpaf_ht_pct || 0) / 100);
}

export function efficiency(p) {
  return (p.ca_ttc || 0) * (p.freq || 0) * ((p.mpaf_ht_pct || 0) / 100);
}

export function isStar(p) {
  return (p.ca_ttc || 0) > 300 && (p.mpaf_ht_pct || 0) > 20;
}

export function computeStats(rows) {
  const total = rows.reduce((s, r) => s + (r.ca_ttc || 0), 0);
  const totalMpaf = rows.reduce((s, r) => s + (r.mpaf || 0), 0);
  const totalUvc = rows.reduce((s, r) => s + (r.uvc || 0), 0);
  const totalCasse = rows.reduce((s, r) => s + (r.casse_paf || 0), 0);

  const topCa = [...rows].sort((a, b) => (b.ca_ttc || 0) - (a.ca_ttc || 0)).slice(0, 15);
  const topMpaf = [...rows].sort((a, b) => (b.mpaf || 0) - (a.mpaf || 0)).slice(0, 15);
  const topEff = [...rows].sort((a, b) => efficiency(b) - efficiency(a)).slice(0, 15);
  const stars = rows.filter(isStar)
    .sort((a, b) => (b.ca_ttc || 0) * (b.mpaf_ht_pct || 0) - (a.ca_ttc || 0) * (a.mpaf_ht_pct || 0))
    .slice(0, 10);
  const risky = rows.filter(r => (r.uvc || 0) > 0)
    .sort((a, b) => riskScore(a) - riskScore(b)).slice(0, 20);
  const zeros = rows.filter(r => !r.uvc && !r.ca_ttc);
  const casse = rows.filter(r => (r.casse_paf || 0) > 0)
    .sort((a, b) => (b.casse_paf || 0) - (a.casse_paf || 0)).slice(0, 10);

  return { total, totalMpaf, totalUvc, totalCasse, count: rows.length, topCa, topMpaf, topEff, stars, risky, zeros, casse };
}

// For analyses loaded from Supabase: rows are stored, the columns report is not.
export function inferColumns(rows) {
  const keys = ['ca_ttc', 'uvc', 'mpaf_ht_pct', 'mpaf', 'freq', 'panier', 'casse_paf', 'casse_uvc'];
  const found = ['ean', 'designation'], missing = [];
  for (const key of keys) {
    if (rows.some(r => r[key] != null)) found.push(key); else missing.push(key);
  }
  return { found, missing };
}
```

- [ ] **Step 4: Run the checks**

Run: `node scripts/check-infomil.mjs`
Expected: `ALL CHECKS PASSED`, exit 0.

- [ ] **Step 5: Commit**

```bash
git add src/lib/analyseStats.js scripts/check-infomil.mjs
git commit -m "feat: add null-tolerant stats computation for analyse rayon"
```

---

### Task 3: Storage v2 — migration SQL + `lib/analyses.js` upsert

**Files:**
- Create: `supabase/2026-07-16-analyses-v2.sql`
- Modify: `supabase/schema.sql` (append the same definition, keeping it the source of truth)
- Modify: `src/lib/analyses.js`

**Interfaces:**
- Consumes: `computeStats` output shape (Task 2).
- Produces:
  - `saveAnalysis({ fileName, label, rayon, rayonCode, weekLabel, periodDate, stats, rows }) → Promise<id>` — upsert on `(rayon, week_label)`; throws `Error('TABLE_MISSING')` or `Error('MIGRATION_MISSING')` for guided messages.
  - `getPreviousAnalysis(rayon, beforePeriodDate) → Promise<fullRow|null>` — most recent analysis of the same rayon strictly before the date.
  - `listAnalyses() → Promise<[{ id, created_at, file_name, total_ca, total_mpaf, total_uvc, total_casse, product_count, rayon, week_label, period_date }]>`.
  - `getAnalysis(id)` / `deleteAnalysis(id)` unchanged.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/2026-07-16-analyses-v2.sql` (idempotent — safe on both a fresh project and the existing live table):

```sql
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
```

Append the same block (minus the header comment) to the end of `supabase/schema.sql` under a `-- analyses` section comment, matching the file's existing style.

- [ ] **Step 2: Rewrite `src/lib/analyses.js`**

Replace the existing `saveAnalysis` and `listAnalyses` with (keep `getAnalysis` and `deleteAnalysis` as they are):

```js
import { supabase, isSupabaseConfigured } from './supabase';

function mapError(error) {
  if (error.code === '42P01' || error.message?.includes('does not exist')) {
    return new Error('TABLE_MISSING');
  }
  if (error.code === 'PGRST204' || /column|constraint/i.test(error.message || '')) {
    return new Error('MIGRATION_MISSING');
  }
  return new Error(error.message || 'Erreur de sauvegarde');
}

/**
 * Save (upsert) an analysis. Identity = (rayon, week_label); when either is null
 * (no footer in the CSV) the row simply inserts — NULLs never conflict.
 */
export async function saveAnalysis({ fileName, label, rayon, rayonCode, weekLabel, periodDate, stats, rows }) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré');
  }

  const payload = {
    file_name: label || fileName,
    stats: {
      total: stats.total,
      totalMpaf: stats.totalMpaf,
      totalUvc: stats.totalUvc,
      totalCasse: stats.totalCasse,
      count: stats.count,
      topCa: stats.topCa,
      topMpaf: stats.topMpaf,
      topEff: stats.topEff,
      stars: stats.stars,
      risky: stats.risky,
      zeros: stats.zeros,
      casse: stats.casse,
    },
    total_ca: stats.total,
    total_mpaf: stats.totalMpaf,
    total_uvc: stats.totalUvc,
    total_casse: stats.totalCasse,
    product_count: stats.count,
    rows,
    rayon,
    rayon_code: rayonCode,
    week_label: weekLabel,
    period_date: periodDate,
  };

  const { data, error } = await supabase
    .from('analyses')
    .upsert(payload, { onConflict: 'rayon,week_label' })
    .select('id')
    .single();

  if (error) throw mapError(error);
  return data.id;
}

/**
 * Load all saved analyses (summary list, newest first).
 */
export async function listAnalyses() {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('analyses')
    .select('id, created_at, file_name, total_ca, total_mpaf, total_uvc, total_casse, product_count, rayon, week_label, period_date')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === '42P01' || error.message?.includes('does not exist')) return [];
    // Migration not applied yet: fall back to the legacy column set.
    const legacy = await supabase
      .from('analyses')
      .select('id, created_at, file_name, total_ca, total_mpaf, product_count')
      .order('created_at', { ascending: false })
      .limit(50);
    if (legacy.error) throw new Error(legacy.error.message);
    return legacy.data || [];
  }
  return data || [];
}

/**
 * Most recent analysis of the same rayon strictly before the given date.
 */
export async function getPreviousAnalysis(rayon, beforePeriodDate) {
  if (!isSupabaseConfigured || !supabase || !rayon || !beforePeriodDate) return null;

  const { data, error } = await supabase
    .from('analyses')
    .select('*')
    .eq('rayon', rayon)
    .not('period_date', 'is', null)
    .lt('period_date', beforePeriodDate)
    .order('period_date', { ascending: false })
    .limit(1);

  if (error) return null;
  return data && data.length > 0 ? data[0] : null;
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: build succeeds. (`Analyse.jsx` still calls the old `saveAnalysis(fileName, stats)` signature at this point — that call site is replaced in Task 8; the build only checks syntax/imports, not signatures, so it passes.)

- [ ] **Step 4: Apply the migration**

Print the SQL and ask the user to run `supabase/2026-07-16-analyses-v2.sql` in Supabase Dashboard → SQL Editor (this is a manual, user-owned step — do not attempt to run it yourself). Subsequent tasks work without it (save shows the guided MIGRATION_MISSING banner) but end-to-end verification of Tasks 8+ needs it applied.

- [ ] **Step 5: Commit**

```bash
git add supabase/2026-07-16-analyses-v2.sql supabase/schema.sql src/lib/analyses.js
git commit -m "feat: analyses storage v2 - raw rows, rayon/week identity, upsert"
```

---

### Task 4: Shared formatters + `Sparkline` + `KpiTile`

**Files:**
- Create: `src/lib/format.js`
- Create: `src/components/charts/Sparkline.jsx`
- Create: `src/components/charts/KpiTile.jsx`
- Modify: `src/pages/Analyse.jsx:41-42` (replace local `money`/`num` with the shared import)

**Interfaces:**
- Consumes: design tokens only.
- Produces:
  - `money(v)`, `num(v)`, `signedMoney(v)`, `pct(v)` from `src/lib/format.js`.
  - `<Sparkline points={number[]} width height color accent/>` — null-safe (renders nothing under 2 points).
  - `<KpiTile label value sub delta upIsGood trend/>` — `delta` is a fraction (0.032 = +3,2 %) or null; `trend` is a number array or null; `upIsGood=false` flips delta coloring (casse: down is good).

- [ ] **Step 1: Create `src/lib/format.js`**

```js
export function money(v) {
  return (v || 0).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
}

export function num(v) {
  return (v || 0).toLocaleString('fr-FR');
}

export function signedMoney(v) {
  return (v >= 0 ? '+' : '−') + money(Math.abs(v));
}

export function pct(v, digits = 1) {
  return (v * 100).toFixed(digits).replace('.', ',') + ' %';
}
```

- [ ] **Step 2: Point `Analyse.jsx` at the shared formatters**

In `src/pages/Analyse.jsx`, delete the two local helpers:

```js
function money(v) { return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €'; }
function num(v) { return v.toLocaleString('fr-FR'); }
```

and add to the imports at the top:

```js
import { money, num } from '../lib/format';
```

- [ ] **Step 3: Create `src/components/charts/Sparkline.jsx`**

```jsx
import React from 'react';

/**
 * Micro trend line for stat tiles. Line in the de-emphasis hue, last point
 * accented with a 2px canvas ring (dataviz mark spec).
 */
export function Sparkline({ points, width = 64, height = 22, color = 'var(--stone)', accent = 'var(--primary)' }) {
  if (!points || points.filter(v => v != null).length < 2) return null;
  const vals = points.map(v => v || 0);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pad = 4;
  const xs = vals.map((_, i) => pad + (i / (vals.length - 1)) * (width - 2 * pad));
  const ys = vals.map(v => height - pad - ((v - min) / span) * (height - 2 * pad));
  const d = xs.map((x, i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + ys[i].toFixed(1)).join(' ');
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3.5" fill={accent} stroke="var(--canvas)" strokeWidth="2"/>
    </svg>
  );
}
```

- [ ] **Step 4: Create `src/components/charts/KpiTile.jsx`**

```jsx
import React from 'react';
import { Sparkline } from './Sparkline';

/**
 * Stat tile: label / value / optional delta vs previous week / optional trend.
 * Delta color = direction x whether up is good (dataviz stat-tile contract);
 * the arrow makes it never color-alone.
 */
export function KpiTile({ label, value, sub, delta, upIsGood = true, trend }) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const up = hasDelta && delta >= 0;
  const good = hasDelta && up === upIsGood;
  return (
    <div style={{
      flex: 1, minWidth: 130,
      borderRadius: 8, border: '0.5px solid var(--hairline)',
      padding: '10px 12px', background: 'var(--canvas)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>{value}</div>
        {trend && <Sparkline points={trend}/>}
      </div>
      <div style={{ fontSize: 11, marginTop: 2, display: 'flex', gap: 6, alignItems: 'baseline', minHeight: 14 }}>
        {hasDelta && (
          <span style={{ color: good ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
            {(up ? '▲ +' : '▼ −') + Math.abs(delta * 100).toFixed(1).replace('.', ',') + ' %'}
          </span>
        )}
        {sub && <span style={{ color: 'var(--steel)' }}>{sub}</span>}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify the build**

Run: `npm run build`
Expected: success. Then `node scripts/check-infomil.mjs` still passes (format.js is not imported there, this is a regression guard).

- [ ] **Step 6: Commit**

```bash
git add src/lib/format.js src/components/charts/Sparkline.jsx src/components/charts/KpiTile.jsx src/pages/Analyse.jsx
git commit -m "feat: add shared formatters, Sparkline and KpiTile chart primitives"
```

---

### Task 5: `ScatterQuadrant` chart

**Files:**
- Create: `src/components/charts/ScatterQuadrant.jsx`

**Interfaces:**
- Consumes: parser row shape (Task 1), `money` (Task 4).
- Produces: `<ScatterQuadrant rows caThreshold=300 margeThreshold=20 onSelectEan/>` — filters to `ca_ttc > 0 && mpaf_ht_pct != null` internally; renders nothing useful below 3 points (returns null).

- [ ] **Step 1: Create `src/components/charts/ScatterQuadrant.jsx`**

```jsx
import React, { useMemo, useState } from 'react';
import { money } from '../../lib/format';

const W = 720, H = 340, PAD = { t: 18, r: 18, b: 36, l: 56 };
const CA_TICKS = [0, 50, 100, 300, 600, 1000, 2000, 5000];

/**
 * One dot per ref: x = marge %, y = CA TTC (sqrt scale), radius ~ UVC.
 * Quadrant guides at the "star" thresholds. Hover tooltip, click -> product.
 * Single series: every dot wears --primary (6.6:1), 2px canvas ring on hover.
 */
export function ScatterQuadrant({ rows, caThreshold = 300, margeThreshold = 20, onSelectEan }) {
  const [hover, setHover] = useState(null); // index into pts.data

  const pts = useMemo(() => {
    const data = rows.filter(r => (r.ca_ttc || 0) > 0 && r.mpaf_ht_pct != null);
    if (data.length < 3) return null;
    const maxCa = Math.max(...data.map(r => r.ca_ttc), caThreshold * 1.2);
    const maxMarge = Math.max(...data.map(r => r.mpaf_ht_pct), 45);
    const maxUvc = Math.max(...data.map(r => r.uvc || 0), 1);
    const x = v => PAD.l + (v / maxMarge) * (W - PAD.l - PAD.r);
    const y = v => H - PAD.b - (Math.sqrt(Math.max(v, 0)) / Math.sqrt(maxCa)) * (H - PAD.t - PAD.b);
    return {
      data: data.map(r => ({
        r, cx: x(r.mpaf_ht_pct), cy: y(r.ca_ttc),
        rad: 3 + 5 * Math.sqrt((r.uvc || 0) / maxUvc),
      })),
      x, y, maxMarge, maxCa, xT: x(margeThreshold), yT: y(caThreshold),
    };
  }, [rows, caThreshold, margeThreshold]);

  if (!pts) return null;
  const { data, x, y, maxMarge, xT, yT } = pts;
  const margeTicks = [];
  for (let v = 0; v <= maxMarge; v += 10) margeTicks.push(v);
  const caTicks = CA_TICKS.filter(v => v <= pts.maxCa);
  const hovered = hover != null ? data[hover] : null;

  return (
    <div style={{ position: 'relative', padding: '8px 4px 4px' }}>
      <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHover(null)}>
        {/* Quadrant washes */}
        <rect x={xT} y={PAD.t} width={W - PAD.r - xT} height={yT - PAD.t} fill="var(--tint-mint)" opacity="0.35"/>
        <rect x={PAD.l} y={yT} width={xT - PAD.l} height={H - PAD.b - yT} fill="var(--tint-gray)" opacity="0.5"/>
        {/* Gridlines (hairline, solid) + axis ticks */}
        {margeTicks.map(v => (
          <g key={'x' + v}>
            <line x1={x(v)} y1={PAD.t} x2={x(v)} y2={H - PAD.b} stroke="var(--hairline)" strokeWidth="1"/>
            <text x={x(v)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="var(--stone)" fontFamily="var(--font-mono)">{v}%</text>
          </g>
        ))}
        {caTicks.map(v => (
          <g key={'y' + v}>
            <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke="var(--hairline)" strokeWidth="1"/>
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--stone)" fontFamily="var(--font-mono)">{v >= 1000 ? (v / 1000) + 'k' : v}</text>
          </g>
        ))}
        {/* Threshold guides */}
        <line x1={xT} y1={PAD.t} x2={xT} y2={H - PAD.b} stroke="var(--hairline-strong)" strokeWidth="1"/>
        <line x1={PAD.l} y1={yT} x2={W - PAD.r} y2={yT} stroke="var(--hairline-strong)" strokeWidth="1"/>
        {/* Quadrant labels (muted text tokens) */}
        <text x={W - PAD.r - 6} y={PAD.t + 14} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--steel)" letterSpacing="0.06em">STARS</text>
        <text x={PAD.l + 6} y={PAD.t + 14} fontSize="10" fontWeight="600" fill="var(--steel)" letterSpacing="0.06em">GROS CA · MARGE FAIBLE</text>
        <text x={PAD.l + 6} y={H - PAD.b - 8} fontSize="10" fontWeight="600" fill="var(--stone)" letterSpacing="0.06em">POIDS MORTS</text>
        <text x={W - PAD.r - 6} y={H - PAD.b - 8} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--steel)" letterSpacing="0.06em">À POUSSER</text>
        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.rad}
            fill="var(--primary)" fillOpacity={hover === i ? 0.95 : 0.45}
            stroke={hover === i ? 'var(--canvas)' : 'none'} strokeWidth="2"/>
        ))}
        {/* Hit targets (>= mark, min 8px radius) */}
        {data.map((d, i) => (
          <circle key={'h' + i} cx={d.cx} cy={d.cy} r={Math.max(d.rad + 4, 8)} fill="transparent"
            style={{ cursor: onSelectEan ? 'pointer' : 'default' }}
            onMouseEnter={() => setHover(i)}
            onClick={onSelectEan ? () => onSelectEan(d.r.ean) : undefined}/>
        ))}
      </svg>
      {/* Axis titles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--stone)', padding: '2px 8px 0', fontWeight: 600, letterSpacing: '0.06em' }}>
        <span>CA TTC (échelle √)</span>
        <span>MARGE MPAF HT %</span>
      </div>
      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: (hovered.cx / W * 100) + '%',
          top: (hovered.cy / H * 100) + '%',
          transform: 'translate(-50%, calc(-100% - 12px))',
          background: 'var(--charcoal)', color: 'white',
          padding: '6px 10px', borderRadius: 6, fontSize: 11,
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
          boxShadow: 'var(--sh-2)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{hovered.r.designation}</div>
          <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.85 }}>
            {money(hovered.r.ca_ttc)} · {hovered.r.mpaf_ht_pct}% · {hovered.r.uvc || 0} UVC
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/ScatterQuadrant.jsx
git commit -m "feat: add ScatterQuadrant chart (CA x marge, star thresholds)"
```

---

### Task 6: `ParetoCurve` chart

**Files:**
- Create: `src/components/charts/ParetoCurve.jsx`

**Interfaces:**
- Consumes: parser row shape (needs `ca_ttc` only).
- Produces: `<ParetoCurve rows/>` — returns null below 3 sellers.

- [ ] **Step 1: Create `src/components/charts/ParetoCurve.jsx`**

```jsx
import React, { useMemo, useState } from 'react';

const W = 720, H = 240, PAD = { t: 16, r: 18, b: 30, l: 44 };

/**
 * Cumulative CA concentration: refs ranked by CA desc, y = cumulative % of CA.
 * Single primary line + 10% area wash, 80% marker with direct label,
 * crosshair tooltip on hover.
 */
export function ParetoCurve({ rows }) {
  const [hover, setHover] = useState(null); // rank index (0-based)

  const model = useMemo(() => {
    const sorted = rows.filter(r => (r.ca_ttc || 0) > 0).sort((a, b) => b.ca_ttc - a.ca_ttc);
    if (sorted.length < 3) return null;
    const total = sorted.reduce((s, r) => s + r.ca_ttc, 0);
    let cum = 0;
    const pcts = sorted.map(r => { cum += r.ca_ttc; return cum / total * 100; });
    const n80 = pcts.findIndex(p => p >= 80) + 1;
    const x = i => PAD.l + (i / (sorted.length - 1)) * (W - PAD.l - PAD.r);
    const y = p => H - PAD.b - (p / 100) * (H - PAD.t - PAD.b);
    const path = pcts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p).toFixed(1)).join(' ');
    const area = path + ' L' + x(pcts.length - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z';
    return { pcts, n80, x, y, path, area, count: sorted.length };
  }, [rows]);

  if (!model) return null;
  const { pcts, n80, x, y, path, area, count } = model;

  const handleMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const vx = ratio * W;
    const i = Math.round((vx - PAD.l) / (W - PAD.l - PAD.r) * (count - 1));
    setHover(i >= 0 && i < count ? i : null);
  };

  return (
    <div style={{ position: 'relative', padding: '8px 4px 4px' }}>
      <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {[0, 25, 50, 75, 100].map(p => (
          <g key={p}>
            <line x1={PAD.l} y1={y(p)} x2={W - PAD.r} y2={y(p)} stroke="var(--hairline)" strokeWidth="1"/>
            <text x={PAD.l - 6} y={y(p) + 3} textAnchor="end" fontSize="10" fill="var(--stone)" fontFamily="var(--font-mono)">{p}%</text>
          </g>
        ))}
        <path d={area} fill="var(--primary)" opacity="0.08"/>
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {/* 80% marker + guides + direct label */}
        <line x1={x(n80 - 1)} y1={y(pcts[n80 - 1])} x2={x(n80 - 1)} y2={H - PAD.b} stroke="var(--hairline-strong)" strokeWidth="1"/>
        <circle cx={x(n80 - 1)} cy={y(pcts[n80 - 1])} r="4" fill="var(--primary)" stroke="var(--canvas)" strokeWidth="2"/>
        <text x={Math.min(x(n80 - 1) + 8, W - 190)} y={y(pcts[n80 - 1]) - 8} fontSize="11" fontWeight="600" fill="var(--charcoal)">
          {n80 + ' réfs → 80 % du CA'}
        </text>
        <text x={x(n80 - 1)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="var(--steel)" fontFamily="var(--font-mono)">{n80}</text>
        {/* End tick */}
        <text x={W - PAD.r} y={H - PAD.b + 16} textAnchor="end" fontSize="10" fill="var(--stone)" fontFamily="var(--font-mono)">{count} réfs</text>
        {/* Crosshair */}
        {hover != null && (
          <g>
            <line x1={x(hover)} y1={PAD.t} x2={x(hover)} y2={H - PAD.b} stroke="var(--hairline-strong)" strokeWidth="1"/>
            <circle cx={x(hover)} cy={y(pcts[hover])} r="4" fill="var(--primary)" stroke="var(--canvas)" strokeWidth="2"/>
          </g>
        )}
      </svg>
      {hover != null && (
        <div style={{
          position: 'absolute', left: (x(hover) / W * 100) + '%', top: (y(pcts[hover]) / H * 100) + '%',
          transform: 'translate(-50%, calc(-100% - 12px))',
          background: 'var(--charcoal)', color: 'white', padding: '5px 9px', borderRadius: 6,
          fontSize: 11, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5, boxShadow: 'var(--sh-2)',
        }}>
          Top {hover + 1} réfs · {pcts[hover].toFixed(0)} % du CA
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/ParetoCurve.jsx
git commit -m "feat: add ParetoCurve chart (CA concentration, 80% marker)"
```

---

### Task 7: `DeltaBars` chart

**Files:**
- Create: `src/components/charts/DeltaBars.jsx`

**Interfaces:**
- Consumes: `signedMoney` (Task 4).
- Produces: `<DeltaBars items onSelectEan/>` — `items = [{ ean, designation, delta }]` pre-sorted by the caller (gainers first, then losers).

- [ ] **Step 1: Create `src/components/charts/DeltaBars.jsx`**

Div-based diverging bars (no svg needed): center baseline, bar grows left (loss, `--error`) or right (gain, `--success`), **signed value label on every row** (mandatory: green fill is 2.93:1, the label is the relief channel). 4px rounded data-end, square at the baseline.

```jsx
import React from 'react';
import { signedMoney } from '../../lib/format';

/**
 * Diverging horizontal bars: CA delta per ref vs previous week.
 * Polarity wears status tokens (gain/loss IS good/bad here); every bar
 * carries a visible signed label — the green fill alone is sub-3:1.
 */
export function DeltaBars({ items, onSelectEan }) {
  if (!items || items.length === 0) return null;
  const max = Math.max(...items.map(it => Math.abs(it.delta)), 1);

  return (
    <div style={{ padding: '6px 12px 10px' }}>
      {items.map((it, i) => {
        const pos = it.delta >= 0;
        const w = Math.abs(it.delta) / max * 50; // % of half-track
        return (
          <div key={it.ean + i}
            onClick={onSelectEan ? () => onSelectEan(it.ean) : undefined}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint-lavender)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              display: 'grid', gridTemplateColumns: 'minmax(120px, 190px) 1fr 86px',
              gap: 10, alignItems: 'center', height: 28, padding: '0 4px',
              borderRadius: 4, cursor: onSelectEan ? 'pointer' : 'default',
              transition: 'background 0.07s',
            }}>
            <div style={{ fontSize: 12, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.designation}
            </div>
            <div style={{ position: 'relative', height: 14 }}>
              {/* Center baseline */}
              <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1, background: 'var(--hairline-strong)' }}/>
              <div style={{
                position: 'absolute', top: 0, height: 14,
                left: pos ? '50%' : (50 - w) + '%',
                width: w + '%',
                background: pos ? 'var(--success)' : 'var(--error)',
                borderRadius: pos ? '0 4px 4px 0' : '4px 0 0 4px',
              }}/>
            </div>
            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right',
              color: 'var(--charcoal)', fontWeight: 500,
            }}>
              {signedMoney(it.delta)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 2: Verify the build**

Run: `npm run build`
Expected: success.

- [ ] **Step 3: Commit**

```bash
git add src/components/charts/DeltaBars.jsx
git commit -m "feat: add DeltaBars diverging chart for week-over-week deltas"
```

---

### Task 8: Analyse page — new import flow, auto-save, import report

**Files:**
- Modify: `src/pages/Analyse.jsx` (replace `parseCsv`, `riskScore`, `efficiency`, `isStar`, `handleFile`, `handleSave`, save-related state and header; keep `MiniTable`, `Section`, `StatCard`, `EmptyState`, `LoadingState`, `EanRender`, tabs rendering as-is for now)

**Interfaces:**
- Consumes: `parseInfomilCsv`, `deriveWeek`, `buildLabel`, `COLUMN_LABELS`, `titleCase` (Task 1); `computeStats`, `inferColumns`, `riskScore`, `efficiency`, `isStar` (Task 2); `saveAnalysis`, `listAnalyses`, `getAnalysis` (Task 3).
- Produces: page state model used by Tasks 9-12:
  - `current`: `{ id, label, fileName, rayon, rayonCode, weekLabel, periodDate, stats, rows, columns, integrity, legacy }` (or null). `legacy: true` = loaded from a pre-migration save (no raw rows).
  - `saveState`: `null | 'saving' | 'saved' | 'error'`; `saveError` string.
  - `report`: `{ count, missingLabels, integrity } | null` (dismissible import report).
  - `has(key)` helper: `current.columns` null (legacy) → assume present when the legacy stats show data; else `columns.found.includes(key)`.

- [ ] **Step 1: Replace imports and delete moved code**

In `src/pages/Analyse.jsx`:
- Delete the local `parseCsv` function (lines 6-39) and the local `riskScore` / `efficiency` / `isStar` functions.
- Update imports:

```js
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '../icons';
import { saveAnalysis, listAnalyses, getAnalysis } from '../lib/analyses';
import { parseInfomilCsv, deriveWeek, buildLabel, titleCase, COLUMN_LABELS } from '../lib/infomil';
import { computeStats, inferColumns, riskScore, efficiency, isStar } from '../lib/analyseStats';
import { money, num } from '../lib/format';
import { useIsDesktop } from '../hooks/useIsDesktop';
```

(`riskScore`/`isStar` are only used indirectly via `computeStats` after this task — import only `efficiency` if that is all the remaining table render needs: the "Score" column in the *Top ventes* tab calls `efficiency(r)`.)

- [ ] **Step 2: Replace the save/state model**

Replace the state block (`stats`, `fileName`, `saving`, `savedId`, `saveError`) with:

```js
const [current, setCurrent] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [activeTab, setActiveTab] = useState('overview');
const [saveState, setSaveState] = useState(null); // null | 'saving' | 'saved' | 'error'
const [saveError, setSaveError] = useState(null);
const [report, setReport] = useState(null);
const [history, setHistory] = useState([]);
const [showHistory, setShowHistory] = useState(false);
const [historyLoading, setHistoryLoading] = useState(false);
```

Everywhere the JSX referenced `stats`, it now reads `current.stats`; `fileName` → `current.label`. `stats.rows + ' références'` becomes `(current.stats.count ?? current.stats.rows) + ' références'` (legacy saves used `rows`/`count` inconsistently).

- [ ] **Step 3: New `handleFile` + `persist`**

```js
const refreshHistory = useCallback(async () => {
  try { setHistory(await listAnalyses()); } catch {}
}, []);

const persist = useCallback(async (cur) => {
  setSaveState('saving');
  setSaveError(null);
  try {
    const id = await saveAnalysis({
      fileName: cur.fileName, label: cur.label,
      rayon: cur.rayon, rayonCode: cur.rayonCode,
      weekLabel: cur.weekLabel, periodDate: cur.periodDate,
      stats: cur.stats, rows: cur.rows,
    });
    setCurrent(c => (c && c.label === cur.label ? { ...c, id } : c));
    setSaveState('saved');
    refreshHistory();
  } catch (e) {
    setSaveState('error');
    if (e.message === 'TABLE_MISSING' || e.message === 'MIGRATION_MISSING') {
      setSaveError('Base non à jour : exécute supabase/2026-07-16-analyses-v2.sql dans Supabase Dashboard > SQL Editor.');
    } else {
      setSaveError(e.message || 'Erreur de sauvegarde');
    }
  }
}, [refreshHistory]);

const handleFile = useCallback(async (file) => {
  setLoading(true);
  setError(null);
  try {
    const text = await file.text();
    const parsed = parseInfomilCsv(text);
    if (parsed.error) { setError(parsed.error); setLoading(false); return; }

    const stats = computeStats(parsed.rows);
    const week = deriveWeek(file.name, parsed.meta);
    const label = buildLabel(week, parsed.meta, file.name);
    const cur = {
      id: null, label, fileName: file.name,
      rayon: parsed.meta.rayon, rayonCode: parsed.meta.rayonCode,
      weekLabel: week ? week.key : null,
      periodDate: parsed.meta.exportedAt
        ? parsed.meta.exportedAt.getFullYear() + '-'
          + String(parsed.meta.exportedAt.getMonth() + 1).padStart(2, '0') + '-'
          + String(parsed.meta.exportedAt.getDate()).padStart(2, '0')
        : null,
      stats, rows: parsed.rows, columns: parsed.columns, integrity: parsed.integrity,
      legacy: false,
    };
    setCurrent(cur);
    setReport({
      count: parsed.rows.length,
      missingLabels: parsed.columns.missing.map(k => COLUMN_LABELS[k]),
      integrity: parsed.integrity,
    });
    setActiveTab('overview');
    setLoading(false);
    persist(cur);
  } catch (e) {
    setError('Erreur de lecture : ' + e.message);
    setLoading(false);
  }
}, [persist]);
```

- [ ] **Step 4: Update `handleLoadAnalysis` (recompute from rows when present)**

```js
const handleLoadAnalysis = useCallback(async (entry) => {
  setLoading(true);
  setError(null);
  setReport(null);
  try {
    const full = await getAnalysis(entry.id);
    if (!full || (!full.stats && !full.rows)) {
      setError('Impossible de charger cette analyse');
      setLoading(false);
      return;
    }
    const hasRows = Array.isArray(full.rows) && full.rows.length > 0;
    const stats = hasRows ? computeStats(full.rows) : full.stats;
    setCurrent({
      id: full.id, label: full.file_name || 'Analyse', fileName: full.file_name,
      rayon: full.rayon || null, rayonCode: full.rayon_code || null,
      weekLabel: full.week_label || null, periodDate: full.period_date || null,
      stats, rows: hasRows ? full.rows : null,
      columns: hasRows ? inferColumns(full.rows) : null,
      integrity: null, legacy: !hasRows,
    });
    setSaveState('saved');
    setSaveError(null);
    setShowHistory(false);
    setActiveTab('overview');
  } catch (e) {
    setError('Erreur de chargement : ' + e.message);
  }
  setLoading(false);
}, []);
```

`handleReset` clears everything: `setCurrent(null); setError(null); setReport(null); setSaveState(null); setSaveError(null);`

- [ ] **Step 5: Header — save status instead of save button**

Replace the `{stats && (<>…Sauvegarder…</>)}` header block with:

```jsx
{current && (
  <>
    {saveState === 'saving' && (
      <span style={{ fontSize: 11, color: 'var(--steel)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon.Spinner s={11} c="var(--steel)"/> Sauvegarde…
      </span>
    )}
    {saveState === 'saved' && (
      <span style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
        <Icon.Check s={11} c="var(--success)"/> {current.label} enregistrée
      </span>
    )}
    {saveState === 'error' && (
      <button onClick={() => persist(current)} className="btn" style={{ height: 28, fontSize: 12, color: 'var(--error)' }}>
        <Icon.Warn s={12} c="var(--error)"/> Non sauvegardée — réessayer
      </button>
    )}
    <button onClick={handleReset} className="btn btn-ghost" style={{ height: 28, fontSize: 12 }}>
      <Icon.Close s={12}/> Nouveau fichier
    </button>
  </>
)}
```

Keep the floating `saveError` toast div (it now shows the migration guidance).

- [ ] **Step 6: Import report card**

Add a local component and render it above the tab chips (`{report && <ImportReport …/>}`):

```jsx
function ImportReport({ report, onClose }) {
  const warn = report.missingLabels.length > 0 || !report.integrity.ok;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 8, marginBottom: 14,
      background: warn ? 'var(--tint-peach)' : 'var(--tint-mint)',
      border: '0.5px solid var(--hairline)', fontSize: 12, color: 'var(--charcoal)',
    }}>
      <div style={{ flex: 1 }}>
        <strong>{num(report.count)} références importées.</strong>
        {' '}
        {report.integrity.ok
          ? '✓ Totaux conformes au fichier.'
          : '⚠ Écart avec les totaux du fichier : '
            + Object.entries(report.integrity.deltas)
                .map(([k, d]) => k + ' calculé ' + d.computed + ' vs ' + d.official)
                .join(' · ') + '.'}
        {report.missingLabels.length > 0 && (
          <div style={{ marginTop: 3, color: 'var(--steel)' }}>
            Colonnes absentes de cet export : {report.missingLabels.join(', ')} — les sections liées sont masquées.
          </div>
        )}
      </div>
      <button onClick={onClose} className="btn btn-ghost" style={{ height: 22, width: 22, padding: 0, flexShrink: 0 }}>
        <Icon.Close s={11}/>
      </button>
    </div>
  );
}
```

- [ ] **Step 7: Update `EmptyState` copy**

In `EmptyState`, replace the helper text `Export <strong>Statistiques vacances Abaco</strong> (format ; encodé UTF-8)` with:

```jsx
ou clique pour sélectionner le fichier<br/>
Export brut <strong>Infomil — Statistiques sur une période</strong>, aucune retouche nécessaire
```

- [ ] **Step 8: Build + manual check**

Run: `npm run build` — expected: success.
Manual (dev server, requires migration from Task 3 applied): drop the raw `s28.csv` → analysis renders, header shows "✓ S28 · Surgeles enregistrée", report card shows "1 1xx références importées ✓ Totaux conformes". Reload the page → the s28 analysis is the one auto-loaded (it is now the most recent save). Drop `s28.csv` again → still exactly one "S28 · Surgeles" row in Supabase (upsert). Check `Fréq`/`Panier` columns in *Top ventes* now show plausible values (they were swapped by the old index-based parser).

- [ ] **Step 9: Commit**

```bash
git add src/pages/Analyse.jsx
git commit -m "feat: raw Infomil import with auto-save upsert and import report"
```

---

### Task 9: Analyse page — analysis switcher in header

**Files:**
- Modify: `src/pages/Analyse.jsx` (header row; history entry rendering)

**Interfaces:**
- Consumes: `history` summaries with `rayon`, `week_label` (Task 3), `handleLoadAnalysis` (Task 8).
- Produces: quick switching between saved analyses without going through the "Analyses sauvegardées" sub-screen (which stays, for deletion/management later).

- [ ] **Step 1: Add the switcher**

In the header (after the "Analyse rayon" title div), when `history.length > 0`, render a native select (styled to match the app inputs):

```jsx
{history.length > 0 && (
  <select
    value={current?.id || ''}
    onChange={e => {
      const entry = history.find(h => h.id === e.target.value);
      if (entry) handleLoadAnalysis(entry);
    }}
    className="input"
    style={{ height: 28, fontSize: 12, width: 'auto', minWidth: 150, padding: '0 8px' }}
  >
    {!current?.id && <option value="">Import en cours…</option>}
    {history.map(h => (
      <option key={h.id} value={h.id}>
        {(h.week_label ? h.week_label.slice(5) + (h.rayon ? ' · ' + titleCase(h.rayon) : '') : h.file_name || 'Analyse')
          + ' — ' + new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
      </option>
    ))}
  </select>
)}
```

(`week_label.slice(5)` turns `2026-S28` into `S28`.)

- [ ] **Step 2: Show rayon in the history sub-screen entries**

In the `history.map(entry => …)` list of the saved-analyses screen, the title line becomes:

```jsx
{(entry.week_label ? entry.week_label.slice(5) + (entry.rayon ? ' · ' + titleCase(entry.rayon) : '') : entry.file_name || 'Analyse')}
```

and the subtitle keeps date · CA · réfs as today.

- [ ] **Step 3: Build + manual check**

Run: `npm run build` — success. Manual: with ≥ 2 saved analyses, switch between them from the header select; the whole page (tabs, stats) follows.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Analyse.jsx
git commit -m "feat: header switcher for saved analyses"
```

---

### Task 10: Vue d'ensemble — KPI tiles, scatter, pareto, conditional sections

**Files:**
- Modify: `src/pages/Analyse.jsx` (overview tab; remove `StatCard` usage — keep the component only if still referenced, else delete it)

**Interfaces:**
- Consumes: `KpiTile`, `Sparkline` (Task 4), `ScatterQuadrant` (Task 5), `ParetoCurve` (Task 6), `history` + `current` (Tasks 8-9), `pct` (Task 4).
- Produces: `rayonSeries(history, current)` helper + `has(key)` column-presence helper reused by Tasks 11-12.

- [ ] **Step 1: Add the helpers (top-level, above the component)**

```js
// Chronological series of saved weeks for the current rayon (max 8),
// including the current unsaved import as a virtual last point.
function rayonSeries(history, current) {
  if (!current || !current.rayon) return [];
  const rows = history
    .filter(h => h.rayon === current.rayon && h.period_date)
    .map(h => ({
      week: h.week_label, date: h.period_date,
      ca: h.total_ca ?? null, mpaf: h.total_mpaf ?? null,
      uvc: h.total_uvc ?? null, casse: h.total_casse ?? null,
    }));
  if (current.periodDate && !rows.some(r => r.week === current.weekLabel)) {
    rows.push({
      week: current.weekLabel, date: current.periodDate,
      ca: current.stats.total, mpaf: current.stats.totalMpaf,
      uvc: current.stats.totalUvc, casse: current.stats.totalCasse ?? null,
    });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows.slice(-8);
}

function deltaOf(series, key, currentWeek) {
  const i = series.findIndex(r => r.week === currentWeek);
  if (i < 1) return null;
  const cur = series[i][key], prev = series[i - 1][key];
  if (cur == null || prev == null || prev === 0) return null;
  return (cur - prev) / prev;
}
```

Inside the component, after the state declarations:

```js
const stats = current?.stats;
const has = useCallback(
  key => !current?.columns || current.columns.found.includes(key),
  [current]
);
const series = rayonSeries(history, current);
const trends = key => (series.length >= 2 ? series.map(r => r[key]) : null);
const margeSeries = series.map(r => (r.ca ? (r.mpaf || 0) / r.ca * 100 : null));
```

- [ ] **Step 2: Replace the StatCard row with KPI tiles**

In the overview tab, replace the four `StatCard`s with:

```jsx
<div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
  <KpiTile label="CA Total TTC" value={money(stats.total)}
    sub={(stats.count ?? stats.rows) + ' réfs'}
    delta={deltaOf(series, 'ca', current.weekLabel)} trend={trends('ca')}/>
  <KpiTile label="Marge (MPAF)" value={money(stats.totalMpaf)}
    delta={deltaOf(series, 'mpaf', current.weekLabel)} trend={trends('mpaf')}/>
  <KpiTile label="Taux de marge" value={(stats.total > 0 ? (stats.totalMpaf / stats.total * 100).toFixed(1) : '—') + ' %'}
    trend={series.length >= 2 ? margeSeries : null}/>
  <KpiTile label="Unités vendues" value={num(stats.totalUvc)}
    sub={stats.totalUvc > 0 ? (stats.total / stats.totalUvc).toFixed(2) + ' €/u' : ''}
    delta={deltaOf(series, 'uvc', current.weekLabel)} trend={trends('uvc')}/>
  {has('casse_paf') && (
    <KpiTile label="Casse" value={money(stats.totalCasse)}
      delta={deltaOf(series, 'casse', current.weekLabel)} upIsGood={false} trend={trends('casse')}/>
  )}
</div>
```

Add imports: `import { KpiTile } from '../components/charts/KpiTile';` etc. Delete the now-unused `StatCard` component. Keep the "Non vendus" information as the existing zeros section lower in the page.

- [ ] **Step 3: Insert the two charts**

After the KPI row, before the stars section (both only when raw rows exist — legacy saves show a note instead):

```jsx
{current.rows ? (
  <>
    {has('mpaf_ht_pct') && (
      <Section title="Portefeuille CA × marge" subtitle="Chaque point est une référence — clique pour ouvrir la fiche" icon={<Icon.BarChart s={14}/>}>
        <ScatterQuadrant rows={current.rows} onSelectEan={eanClick}/>
      </Section>
    )}
    <Section title="Concentration du CA" subtitle="Références classées par CA décroissant" icon={<Icon.BarChart s={14}/>}>
      <ParetoCurve rows={current.rows}/>
    </Section>
  </>
) : (
  <div style={{ fontSize: 12, color: 'var(--steel)', padding: '4px 2px' }}>
    Analyse enregistrée avant la v2 — graphiques indisponibles. Réimporte le fichier CSV pour les activer.
  </div>
)}
```

`ScatterQuadrant` (and `DeltaBars` in Task 11) call back with a bare EAN string, while `rowClick` expects a row object. Keep both variants at the top of the component:

```js
const rowClick = onSelectEan ? (row => onSelectEan(row.ean)) : undefined;
const eanClick = onSelectEan || undefined; // for charts that pass a bare EAN
```

Add the chart imports at the top of the file:

```js
import { KpiTile } from '../components/charts/KpiTile';
import { Sparkline } from '../components/charts/Sparkline';
import { ScatterQuadrant } from '../components/charts/ScatterQuadrant';
import { ParetoCurve } from '../components/charts/ParetoCurve';
```

- [ ] **Step 4: Hide sections whose column is absent**

Two guards, nothing else:
- Overview casse section: `{has('casse_paf') && stats.casse.length > 0 && (<Section title="Casse" …/>)}`.
- *Top ventes* tab, third table ("Meilleur rapport CA x marge x fréquence", which depends on `freq`): wrap in `{has('freq') && (<Section …/>)}`.

Leave the other tables untouched — a null metric renders as an empty cell, not a fake zero.

- [ ] **Step 5: Build + manual check**

Run: `npm run build` — success. Manual: import `s28.csv` → KPI row (no deltas/sparklines with a single save), scatter renders ~1 100 dots with quadrant labels, hover tooltip works, click navigates (desktop: selects in catalogue view), pareto shows the 80 % marker. Save a second week (edit a copy of the CSV's footer date to `06/07/26` and a different data row, name it `s27.csv`) → sparklines and ▲/▼ deltas appear.

- [ ] **Step 6: Commit**

```bash
git add src/pages/Analyse.jsx
git commit -m "feat: overview KPI tiles with trends, scatter and pareto charts"
```

---

### Task 11: Comparaison tab

**Files:**
- Modify: `src/pages/Analyse.jsx` (new tab; comparison state + effect)

**Interfaces:**
- Consumes: `getPreviousAnalysis` (Task 3), `DeltaBars` (Task 7), `MiniTable`/`Section`/`eanCol` (existing), `current` (Task 8), `rowClick`/`eanClick` (Task 10).
- Produces: —

- [ ] **Step 1: Add the tab and its state**

Add to the `tabs` array (after `'overview'`): `{ key: 'compare', label: 'Comparaison' }`.

State + effect inside the component:

```js
const [compare, setCompare] = useState(null); // null | 'loading' | 'none' | { … }

useEffect(() => {
  if (activeTab !== 'compare' || !current) return;
  if (!current.rows || !current.rayon || !current.periodDate) { setCompare('none'); return; }
  let cancelled = false;
  setCompare('loading');
  (async () => {
    const prev = await getPreviousAnalysis(current.rayon, current.periodDate);
    if (cancelled) return;
    if (!prev || !Array.isArray(prev.rows) || prev.rows.length === 0) { setCompare('none'); return; }
    const prevBy = new Map(prev.rows.map(r => [r.ean, r]));
    const curBy = new Map(current.rows.map(r => [r.ean, r]));
    const deltas = [];
    for (const r of current.rows) {
      const p = prevBy.get(r.ean);
      if (p) deltas.push({ ean: r.ean, designation: r.designation, delta: (r.ca_ttc || 0) - (p.ca_ttc || 0) });
    }
    const gainers = deltas.filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 10);
    const losers = deltas.filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 10);
    const appeared = current.rows.filter(r => !prevBy.has(r.ean))
      .sort((a, b) => (b.ca_ttc || 0) - (a.ca_ttc || 0)).slice(0, 15);
    const disappeared = prev.rows.filter(r => !curBy.has(r.ean))
      .sort((a, b) => (b.ca_ttc || 0) - (a.ca_ttc || 0)).slice(0, 15);
    setCompare({ prevLabel: prev.file_name || prev.week_label || 'semaine précédente', gainers, losers, appeared, disappeared });
  })().catch(() => { if (!cancelled) setCompare('none'); });
  return () => { cancelled = true; };
}, [activeTab, current]);
```

Reset `setCompare(null)` inside `handleFile`, `handleLoadAnalysis` and `handleReset`.

- [ ] **Step 2: Render the tab**

```jsx
{activeTab === 'compare' && (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    {compare === 'loading' && <LoadingState message="Comparaison en cours…"/>}
    {compare === 'none' && (
      <div style={{ textAlign: 'center', padding: 48, color: 'var(--steel)', fontSize: 13, lineHeight: 1.6 }}>
        Pas de semaine précédente comparable pour ce rayon.<br/>
        Importe les exports chaque semaine : la comparaison apparaîtra automatiquement.
      </div>
    )}
    {compare && typeof compare === 'object' && (
      <>
        <Section title={'Évolution du CA vs ' + compare.prevLabel} subtitle="Plus fortes hausses et baisses par référence" icon={<Icon.BarChart s={14}/>}>
          <DeltaBars items={[...compare.gainers, ...compare.losers]} onSelectEan={eanClick}/>
        </Section>
        {compare.appeared.length > 0 && (
          <Section title="Nouvelles références" subtitle={compare.appeared.length + ' réfs absentes de ' + compare.prevLabel} icon={<Icon.Check s={14} c="var(--success)"/>} accent="mint">
            <MiniTable compact columns={[
              { key: 'designation', label: 'Produit' },
              eanCol,
              { key: 'ca_ttc', label: 'CA TTC', width: '100px', align: 'right', mono: true, render: v => money(v) },
              { key: 'uvc', label: 'UVC', width: '55px', align: 'right' },
            ]} rows={compare.appeared} onRowClick={rowClick}/>
          </Section>
        )}
        {compare.disappeared.length > 0 && (
          <Section title="Références disparues" subtitle={'Présentes dans ' + compare.prevLabel + ', absentes cette semaine'} icon={<Icon.Close s={14} c="var(--stone)"/>}>
            <MiniTable compact columns={[
              { key: 'designation', label: 'Produit' },
              eanCol,
              { key: 'ca_ttc', label: 'CA TTC préc.', width: '110px', align: 'right', mono: true, render: v => money(v) },
            ]} rows={compare.disappeared} onRowClick={rowClick}/>
          </Section>
        )}
      </>
    )}
  </div>
)}
```

Add `getPreviousAnalysis` to the `../lib/analyses` import and `DeltaBars` to the chart imports.

- [ ] **Step 3: Build + manual check**

Run: `npm run build` — success. Manual: with two saved weeks of the same rayon, the tab shows diverging bars with signed € labels on every row, plus new/disappeared refs tables; with one week it shows the empty state.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Analyse.jsx
git commit -m "feat: week-over-week comparison tab with delta bars"
```

---

### Task 12: Casse trend + conditional casse tab

**Files:**
- Modify: `src/pages/Analyse.jsx` (casse tab + tabs array)

**Interfaces:**
- Consumes: `Sparkline` (Task 4), `series` from `rayonSeries` (Task 10), `has` (Task 10), `pct` (Task 4).
- Produces: —

- [ ] **Step 1: Hide the tab when casse data is absent**

Replace the static `tabs` array with a filtered version:

```js
const tabs = [
  { key: 'overview', label: 'Vue d’ensemble' },
  { key: 'compare', label: 'Comparaison' },
  { key: 'top', label: 'Top ventes' },
  { key: 'stars', label: 'Produits star' },
  { key: 'risky', label: 'À risque' },
  ...(has('casse_paf') ? [{ key: 'casse', label: 'Casse' }] : []),
];
```

And guard the active tab: below the `tabs` definition add

```js
useEffect(() => {
  if (!tabs.some(t => t.key === activeTab)) setActiveTab('overview');
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [current]);
```

- [ ] **Step 2: Trend header above the casse table**

Inside the `activeTab === 'casse'` block, above the existing Section, when at least 2 weeks of the rayon carry casse data:

```jsx
{series.filter(r => r.casse != null).length >= 2 && (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16,
    padding: '12px 16px', borderRadius: 8, border: '0.5px solid var(--hairline)', background: 'var(--canvas)',
  }}>
    <div>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)' }}>Casse / CA</div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--charcoal)' }}>
        {stats.total > 0 ? ((stats.totalCasse || 0) / stats.total * 100).toFixed(2).replace('.', ',') + ' %' : '—'}
      </div>
    </div>
    <Sparkline width={220} height={44}
      points={series.map(r => (r.ca ? (r.casse || 0) / r.ca * 100 : null))}/>
    <div style={{ fontSize: 11, color: 'var(--steel)' }}>
      {series[0].week ? series[0].week.slice(5) : ''} → {series[series.length - 1].week ? series[series.length - 1].week.slice(5) : ''}
    </div>
  </div>
)}
```

(Wrap the existing casse `<Section>` and this header in a fragment.)

- [ ] **Step 3: Build + manual + full check-script pass**

Run: `npm run build` — success. Run: `node scripts/check-infomil.mjs` — `ALL CHECKS PASSED`.
Manual sweep (the spec's test list): raw s28 import ✓ totals; truncated copy without casse columns → report lists them, Casse tab absent; same file twice → one Supabase row; creds removed → retry banner, analysis usable; second week saved → sparklines/deltas/comparison live. Check mobile viewport (375px): KPI tiles wrap, charts scale (svg `width: 100%`), tables scroll horizontally.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Analyse.jsx
git commit -m "feat: casse trend header and conditional casse tab"
```
