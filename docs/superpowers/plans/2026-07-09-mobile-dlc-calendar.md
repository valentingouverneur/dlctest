# Mobile DLC Calendar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give mobile the same DLC-tracking capability desktop already has — a `/dlc` page listing tracked expiry entries, grouped by urgency, with mark-done/reopen and delete actions — per `docs/superpowers/specs/2026-07-09-mobile-dlc-calendar-design.md`.

**Architecture:** Extract the detail-enrichment logic that today lives only inside `DesktopShell.jsx`'s `DlcDesktopView` into `lib/dlcItems.js` so it's shared, then build a new mobile page (`src/pages/Dlc.jsx`) using the app's existing card-list conventions (`Packshot` primitive, `.app-shell` + sticky-header pattern from `Catalogue.jsx`/`Affiche.jsx`), and wire it into the mobile route table and drawer menu.

**Tech Stack:** React 18, plain CSS-in-JS inline styles, existing `lib/dlcItems.js` Supabase/localStorage data layer (no schema or API changes).

## Global Constraints

- No local dev server testing in this environment — verify on the live Vercel deployment after push.
- Locale is French; no new English user-facing strings.
- Match existing code style: inline style objects, `var(--token)` values, `.btn`/`.btn-ghost` classes, `Icon.X` components from `src/icons.jsx` (no new icons needed — `Icon.Calendar`, `Icon.Close`, `Icon.ChevronRight`, `Icon.Spinner` already exist).
- Desktop's `DlcDesktopView` visual behavior must be unchanged after Task 1 (same table-row UI, same in-place-dimmed completed items) — only its enrichment logic moves, nothing about what it renders changes.

---

### Task 1: Move `enrichItem` into `lib/dlcItems.js` as `enrichDlcItem`

**Files:**
- Modify: `src/lib/dlcItems.js:1` (imports), `:207-209` (insert new export between `updateDlcItemDetails` and `deleteDlcItem`)
- Modify: `src/pages/DesktopShell.jsx:11` (import line), `:574-611` (remove inline `enrichItem`, update `refresh()` to call the imported `enrichDlcItem`)

**Interfaces:**
- Produces: `enrichDlcItem(item)` exported from `src/lib/dlcItems.js` — async, takes one DLC item object (the shape returned by `getDlcItems()`/`getDlcItemsAsync()`), returns a Promise resolving to the same item shape (possibly with `title`/`brand`/`weight`/`category`/`image_url` backfilled and persisted).
- Consumes: `getProductByEan` from `src/lib/products.js`, `fetchFromOFF` from `src/lib/openFoodFacts.js`, `searchPackshots` from `src/lib/bingImages.js` (all already used elsewhere in the codebase with these exact signatures), and the already-defined `updateDlcItemDetails` in the same file.

- [ ] **Step 1: Add the three new imports to `lib/dlcItems.js`**

Find:

```js
import { isSupabaseConfigured, requireSupabase } from './supabase';
```

Replace with:

```js
import { isSupabaseConfigured, requireSupabase } from './supabase';
import { getProductByEan } from './products';
import { fetchFromOFF } from './openFoodFacts';
import { searchPackshots } from './bingImages';
```

- [ ] **Step 2: Insert `enrichDlcItem` between `updateDlcItemDetails` and `deleteDlcItem`**

Find (the end of `updateDlcItemDetails` and the start of `deleteDlcItem`):

```js
  lastDlcSyncError = null;
  return replaceLocal(fromDb(data));
}

export async function deleteDlcItem(id) {
```

Replace with:

```js
  lastDlcSyncError = null;
  return replaceLocal(fromDb(data));
}

export async function enrichDlcItem(item) {
  const needsText = !item.title || item.title === item.ean || !item.brand || !item.weight || !item.category;
  const needsImage = !item.image_url;
  if (!needsText && !needsImage) return item;

  let details = null;
  if (needsText || needsImage) {
    details = (await getProductByEan(item.ean).catch(() => null)) || (await fetchFromOFF(item.ean).catch(() => null));
  }

  const updates = {};
  if (details) {
    if ((!item.title || item.title === item.ean) && details.title) updates.title = details.title;
    if (!item.brand && details.brand) updates.brand = details.brand;
    if (!item.weight && details.weight) updates.weight = details.weight;
    if (!item.category && details.category) updates.category = details.category;
    if (!item.image_url && details.image_url) updates.image_url = details.image_url;
  }

  const titleForImage = updates.title || item.title;
  const brandForImage = updates.brand || item.brand;
  if (!updates.image_url && !item.image_url && titleForImage && titleForImage !== item.ean) {
    const shots = await searchPackshots(titleForImage, brandForImage, 1, item.ean).catch(() => []);
    if (shots[0]) updates.image_url = shots[0];
  }

  if (Object.keys(updates).length === 0) return item;
  return (await updateDlcItemDetails(item.id, updates)) || { ...item, ...updates };
}

export async function deleteDlcItem(id) {
```

This is the exact body of the old `DlcDesktopView.enrichItem` (`src/pages/DesktopShell.jsx:574-602`), renamed and moved — same behavior, same call sequence.

- [ ] **Step 3: Update `DesktopShell.jsx`'s `dlcItems` import**

Find:

```js
import { deleteDlcItem, getDlcItems, getDlcItemsAsync, getDlcUrgency, getLastDlcSyncError, updateDlcItemDetails, updateDlcItemStatus } from '../lib/dlcItems';
```

Replace with:

```js
import { deleteDlcItem, enrichDlcItem, getDlcItems, getDlcItemsAsync, getDlcUrgency, getLastDlcSyncError, updateDlcItemStatus } from '../lib/dlcItems';
```

(`updateDlcItemDetails` is dropped from this import — after Step 4 removes the inline `enrichItem`, `DesktopShell.jsx` no longer calls it directly; `enrichDlcItem` is added.)

- [ ] **Step 4: Remove the inline `enrichItem` function and use the imported one in `refresh()`**

Find:

```js
  const enrichItem = async (item) => {
    const needsText = !item.title || item.title === item.ean || !item.brand || !item.weight || !item.category;
    const needsImage = !item.image_url;
    if (!needsText && !needsImage) return item;

    let details = null;
    if (needsText || needsImage) {
      details = (await getProductByEan(item.ean).catch(() => null)) || (await fetchFromOFF(item.ean).catch(() => null));
    }

    const updates = {};
    if (details) {
      if ((!item.title || item.title === item.ean) && details.title) updates.title = details.title;
      if (!item.brand && details.brand) updates.brand = details.brand;
      if (!item.weight && details.weight) updates.weight = details.weight;
      if (!item.category && details.category) updates.category = details.category;
      if (!item.image_url && details.image_url) updates.image_url = details.image_url;
    }

    const titleForImage = updates.title || item.title;
    const brandForImage = updates.brand || item.brand;
    if (!updates.image_url && !item.image_url && titleForImage && titleForImage !== item.ean) {
      const shots = await searchPackshots(titleForImage, brandForImage, 1, item.ean).catch(() => []);
      if (shots[0]) updates.image_url = shots[0];
    }

    if (Object.keys(updates).length === 0) return item;
    return (await updateDlcItemDetails(item.id, updates)) || { ...item, ...updates };
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const loaded = await getDlcItemsAsync();
      setItems(loaded);
      setSyncError(getLastDlcSyncError());
      if (!getLastDlcSyncError() && loaded.length > 0) {
        const enriched = await Promise.all(loaded.map(enrichItem));
        setItems(enriched);
        setSyncError(getLastDlcSyncError());
      }
    } finally {
      setLoading(false);
    }
  };
```

Replace with:

```js
  const refresh = async () => {
    setLoading(true);
    try {
      const loaded = await getDlcItemsAsync();
      setItems(loaded);
      setSyncError(getLastDlcSyncError());
      if (!getLastDlcSyncError() && loaded.length > 0) {
        const enriched = await Promise.all(loaded.map(enrichDlcItem));
        setItems(enriched);
        setSyncError(getLastDlcSyncError());
      }
    } finally {
      setLoading(false);
    }
  };
```

- [ ] **Step 5: Verify no other reference to the removed local `enrichItem` remains**

`grep -n "enrichItem" src/pages/DesktopShell.jsx` — expect zero matches (the only two were the definition just removed and the `loaded.map(enrichItem)` call just changed to `enrichDlcItem`). If anything else matches, the removal was incomplete.

- [ ] **Step 6: Manual verification**

No automated tests. Re-read `src/lib/dlcItems.js` end to end once to confirm the file still parses as valid JS (balanced braces — `enrichDlcItem` adds one function with matching `{`/`}`), and re-read `src/pages/DesktopShell.jsx`'s `DlcDesktopView` function (`grep -n "function DlcDesktopView" src/pages/DesktopShell.jsx` then read from that line) to confirm `refresh()` now calls `enrichDlcItem` and the file still parses.

- [ ] **Step 7: Commit**

```bash
git add src/lib/dlcItems.js src/pages/DesktopShell.jsx
git commit -m "refactor: move DLC detail-enrichment logic into lib/dlcItems.js

Extracts DlcDesktopView's inline enrichItem into an exported
enrichDlcItem so the upcoming mobile DLC page can reuse it instead of
duplicating the Supabase/OFF/packshot-search backfill chain. No
behavior change on desktop.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Do not push yet — push happens once with Tasks 2-3 in Task 4.

---

### Task 2: Build the mobile `Dlc` page

**Files:**
- Create: `src/pages/Dlc.jsx`

**Interfaces:**
- Consumes: `getDlcItemsAsync()`, `enrichDlcItem(item)` (from Task 1), `getLastDlcSyncError()`, `updateDlcItemStatus(id, status)`, `deleteDlcItem(id)`, `getDlcUrgency(item)` — all from `src/lib/dlcItems.js`. `Packshot` from `src/primitives.jsx` (`Packshot({ product: {title, brand, cat, imageUrl}, size, radius, hint })`). `Icon.Calendar`, `Icon.Close`, `Icon.ChevronRight`, `Icon.Spinner` from `src/icons.jsx`.
- Produces: `export function Dlc()` — the page component — and `export default Dlc`, matching every other page file's export convention in `src/pages/`.

- [ ] **Step 1: Create the file**

Write `src/pages/Dlc.jsx`:

```jsx
import React, { useEffect, useState, useCallback } from 'react';
import { Icon } from '../icons';
import { Packshot } from '../primitives';
import {
  getDlcItemsAsync, enrichDlcItem, getLastDlcSyncError,
  updateDlcItemStatus, deleteDlcItem, getDlcUrgency,
} from '../lib/dlcItems';

const URGENCY_SECTIONS = [
  { key: 'today', label: 'Aujourd’hui' },
  { key: 'tomorrow', label: 'Demain' },
  { key: 'soon', label: 'Bientôt' },
  { key: 'later', label: 'Plus tard' },
];

function urgencyMeta(item) {
  const u = getDlcUrgency(item);
  if (u === 'today') return { label: 'Aujourd’hui', bg: 'var(--tint-peach)', color: 'var(--warning)' };
  if (u === 'tomorrow') return { label: 'Demain', bg: 'oklch(0.96 0.05 80)', color: 'oklch(0.55 0.12 70)' };
  if (u === 'soon') return { label: 'Bientôt', bg: 'var(--tint-lavender)', color: 'var(--primary)' };
  return { label: 'Plus tard', bg: 'var(--surface)', color: 'var(--steel)' };
}

function DlcCard({ item, onToggleStatus, onDelete }) {
  const meta = urgencyMeta(item);
  const done = item.status !== 'a_traiter';
  return (
    <div style={{
      borderRadius: 10, overflow: 'hidden', background: 'var(--canvas)',
      border: '0.5px solid var(--hairline)', marginBottom: 8,
      opacity: done ? 0.7 : 1,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', padding: 12 }}>
        <Packshot product={{ title: item.title, brand: item.brand, cat: item.category, imageUrl: item.image_url }} size={48} radius={8} hint={false}/>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 550, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {item.title}
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>
            {[item.brand, item.weight, item.ean].filter(Boolean).join(' · ')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-2)' }}>{item.expiryDate}</span>
            <span style={{ color: 'var(--ink-5)' }}>·</span>
            <span className="mono" style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.quantity} u.</span>
            {item.zone && (
              <>
                <span style={{ color: 'var(--ink-5)' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--ink-3)' }}>{item.zone}</span>
              </>
            )}
          </div>
        </div>
        <span style={{ padding: '4px 8px', borderRadius: 99, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 650, flexShrink: 0 }}>
          {done ? item.status : meta.label}
        </span>
      </div>
      <div style={{ display: 'flex', gap: 8, padding: '0 12px 12px' }}>
        <button
          onClick={() => onToggleStatus(item.id, done ? 'a_traiter' : 'fait')}
          className="btn" style={{ flex: 1, height: 34, fontSize: 12.5, justifyContent: 'center' }}
        >
          {done ? 'Rouvrir' : 'Fait'}
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="btn btn-ghost" style={{ height: 34, width: 34, padding: 0, justifyContent: 'center', color: 'var(--error)' }}
        >
          <Icon.Close s={13}/>
        </button>
      </div>
    </div>
  );
}

export function Dlc() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncError, setSyncError] = useState(null);
  const [showDone, setShowDone] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await getDlcItemsAsync();
      setItems(loaded);
      setSyncError(getLastDlcSyncError());
      if (!getLastDlcSyncError() && loaded.length > 0) {
        const enriched = await Promise.all(loaded.map(enrichDlcItem));
        setItems(enriched);
        setSyncError(getLastDlcSyncError());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const toggleStatus = async (id, status) => {
    await updateDlcItemStatus(id, status);
    refresh();
  };
  const remove = async (id) => {
    await deleteDlcItem(id);
    refresh();
  };

  const pending = items.filter(i => i.status === 'a_traiter');
  const done = items.filter(i => i.status !== 'a_traiter');
  // 'later' also absorbs items with no/invalid expiryDate (getDlcUrgency
  // returns 'none' for those) so they still surface instead of silently
  // vanishing from every section.
  const byUrgency = (key) => pending.filter(i => {
    const u = getDlcUrgency(i);
    return key === 'later' ? (u === 'later' || u === 'none') : u === key;
  });

  return (
    <div className="app-shell">
      <header style={{
        position: 'sticky', top: 48, zIndex: 10,
        background: 'var(--canvas)', borderBottom: '0.5px solid var(--line)',
        padding: '12px 16px 10px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Calendrier DLC</h1>
        <button onClick={refresh} disabled={loading} className="btn btn-ghost" style={{ height: 30, fontSize: 12 }}>
          {loading ? <Icon.Spinner s={12}/> : 'Rafraîchir'}
        </button>
      </header>

      <div style={{ padding: 16 }}>
        {syncError && (
          <div style={{ padding: '10px 12px', borderRadius: 10, background: 'var(--tint-peach)', color: 'var(--warning)', fontSize: 12.5, marginBottom: 12 }}>
            Synchro Supabase indisponible : lance le schema SQL pour créer <span className="mono">dlc_items</span>.
          </div>
        )}

        {items.length === 0 && !loading && (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--ink-4)' }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>Aucune DLC enregistrée</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              Dans le scanner, scanne un produit puis touche le petit bouton « DLC » si besoin.
            </div>
          </div>
        )}

        {items.length === 0 && loading && (
          <div style={{ padding: '48px 16px', textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>
            Chargement des DLC…
          </div>
        )}

        {URGENCY_SECTIONS.map(section => {
          const sectionItems = byUrgency(section.key);
          if (sectionItems.length === 0) return null;
          return (
            <div key={section.key} style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--ink-3)', marginBottom: 8 }}>
                {section.label} ({sectionItems.length})
              </div>
              {sectionItems.map(item => (
                <DlcCard key={item.id} item={item} onToggleStatus={toggleStatus} onDelete={remove}/>
              ))}
            </div>
          );
        })}

        {done.length > 0 && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setShowDone(s => !s)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                padding: '8px 0', border: 'none', background: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: 12, fontWeight: 650, textTransform: 'uppercase',
                letterSpacing: '0.04em', color: 'var(--ink-3)',
              }}
            >
              <span style={{ transform: showDone ? 'rotate(90deg)' : 'none', display: 'flex', transition: 'transform 0.15s' }}>
                <Icon.ChevronRight s={12}/>
              </span>
              Terminées ({done.length})
            </button>
            {showDone && done.map(item => (
              <DlcCard key={item.id} item={item} onToggleStatus={toggleStatus} onDelete={remove}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Dlc;
```

Note the `’`/`ô`/`é`/`è`/`à`/`·`/`«`/`»`/`…` escapes above are French accented characters and punctuation (’, ô, é, è, à, ·, «, », …) — write them as the literal UTF-8 characters in the actual file, not as JS escape sequences; they're written as `\uXXXX` here only because this plan document's own encoding pipeline is not guaranteed to preserve raw accented characters when the plan file itself is written/read. Every other page in `src/pages/` uses literal accented characters directly in JSX text — match that.

- [ ] **Step 2: Manual verification**

No automated tests. Re-read the full file once to confirm: every JSX tag opened is closed, the two `import` blocks resolve to real exports (cross-check against Task 1's `lib/dlcItems.js` changes and the existing `src/primitives.jsx`/`src/icons.jsx`), and the accented characters were written as literal UTF-8, not escape sequences or mangled bytes (a common failure mode — re-open the file and visually confirm "Aujourd’hui", "Bientôt", "Terminées", "Rafraîchir", "«", "»", "…" render correctly, not as `?` or mojibake).

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dlc.jsx
git commit -m "feat: add mobile Calendrier DLC page

Cards grouped by urgency (Aujourd'hui/Demain/Bientôt/Plus tard) with a
collapsed Terminées section, mirroring the desktop DLC view's data and
actions (mark done/reopen, delete) in the app's mobile card style.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Do not push yet — push happens once with Task 3 in Task 4.

---

### Task 3: Wire the route and drawer menu entry

**Files:**
- Modify: `src/App.jsx:8` (imports), `:22-27` (drawer items), `:150-159` (routes)

**Interfaces:**
- Consumes: `Dlc` exported from `src/pages/Dlc.jsx` (Task 2).

- [ ] **Step 1: Import `Dlc`**

Find:

```jsx
import { Heures } from './pages/Heures';
import { Analyse } from './pages/Analyse';
```

Replace with:

```jsx
import { Heures } from './pages/Heures';
import { Analyse } from './pages/Analyse';
import { Dlc } from './pages/Dlc';
```

- [ ] **Step 2: Add the drawer menu entry, right after Catalogue**

Find:

```jsx
    { id: '/', label: 'Affiche', icon: on => <Icon.Image s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/catalogue', label: 'Catalogue', icon: on => <Icon.Catalog s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/scan', label: 'Scanner', icon: on => <Icon.Scan s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/analyse', label: 'Analyse rayon', icon: on => <Icon.BarChart s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/heures', label: 'Heures', icon: on => <Icon.Clock s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
```

Replace with:

```jsx
    { id: '/', label: 'Affiche', icon: on => <Icon.Image s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/catalogue', label: 'Catalogue', icon: on => <Icon.Catalog s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/dlc', label: 'Calendrier DLC', icon: on => <Icon.Calendar s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/scan', label: 'Scanner', icon: on => <Icon.Scan s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/analyse', label: 'Analyse rayon', icon: on => <Icon.BarChart s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
    { id: '/heures', label: 'Heures', icon: on => <Icon.Clock s={18} c={on ? 'var(--primary)' : 'var(--ink-3)'}/> },
```

- [ ] **Step 3: Add the route**

Find:

```jsx
          <Route path="/" element={<Affiche/>}/>
          <Route path="/catalogue" element={<Catalogue/>}/>
          <Route path="/scan" element={<Scanner/>}/>
          <Route path="/analyse" element={<Analyse/>}/>
          <Route path="/heures" element={<Heures/>}/>
```

Replace with:

```jsx
          <Route path="/" element={<Affiche/>}/>
          <Route path="/catalogue" element={<Catalogue/>}/>
          <Route path="/dlc" element={<Dlc/>}/>
          <Route path="/scan" element={<Scanner/>}/>
          <Route path="/analyse" element={<Analyse/>}/>
          <Route path="/heures" element={<Heures/>}/>
```

- [ ] **Step 4: Confirm the mobile header title mapping already covers `/dlc`**

`grep -n "'/dlc'" src/App.jsx` — expect one match, the existing line
`{location.pathname === '/dlc' && 'Calendrier DLC'}` in the `MobileShell` title block. This line predates this task (it was dead code with no matching route) and needs no change — the new route makes it reachable. If it's missing for any reason, add it back next to the `/heures` title line using the same pattern.

- [ ] **Step 5: Manual verification**

No automated tests. Re-read the three edited regions of `src/App.jsx` to confirm brace/tag balance and that the new lines match the surrounding array/JSX syntax exactly (trailing commas, quote style).

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx
git commit -m "feat: wire /dlc route and drawer entry to the new mobile page

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: Push and verify

- [ ] **Step 1: Review the full diff for this plan's work**

```bash
git log --oneline -3
git diff --stat HEAD~3
```

Expect exactly the 3 commits from Tasks 1-3, touching `src/lib/dlcItems.js`, `src/pages/DesktopShell.jsx`, `src/pages/Dlc.jsx` (new), `src/App.jsx`.

- [ ] **Step 2: Push**

```bash
git push origin main
```

- [ ] **Step 3: Ask the user to verify on the live deployment**

Ask the user to open the site on mobile (or a narrow browser window), open the drawer menu, confirm "Calendrier DLC" appears between Catalogue and Scanner, tap it, and confirm:
1. Existing DLC entries (if any) appear as cards grouped under Aujourd'hui/Demain/Bientôt/Plus tard headers, each showing thumbnail, title, brand/weight/EAN, expiry date, quantity, zone (if set), and a status badge.
2. Tapping "Fait" on a card moves it out of its urgency section and into a collapsed "Terminées" section at the bottom; tapping "Rouvrir" on a done item brings it back.
3. Tapping the delete (✕) button removes the card immediately.
4. If there are zero DLC entries, the empty-state message appears instead of a blank page.
5. On desktop, the existing "Calendrier DLC" sidebar view still works exactly as before (spot-check: it still loads, still enriches missing product details, mark-done/delete still work) — this confirms Task 1's refactor didn't regress desktop behavior.

Fix anything reported before considering this plan complete.
