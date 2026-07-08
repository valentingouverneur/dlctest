# Responsive Audit & Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the responsive gaps found in `docs/superpowers/specs/2026-07-08-responsive-audit-design.md` — pages that don't use available desktop width, an unhandled 768–1024px tablet range, and unverified small-phone rendering.

**Architecture:** Three sequential phases, each ending in a commit + push to `main` (Vercel auto-deploys) and a manual visual check by the user on the live site before the next phase starts. No automated test runner exists in this project (per `CLAUDE.md`) — every verification step here is a manual browser check with an exact viewport width and an exact thing to look for.

**Tech Stack:** React 18, plain CSS-in-JS (inline styles), `useIsDesktop` hook (`src/hooks/useIsDesktop.js`), no CSS framework.

## Global Constraints

- No local dev server testing in this environment — changes are verified on the live Vercel deployment after push (per user preference this session).
- Ultra-wide screens (2560px+) are explicitly out of scope — do not add ultra-wide-specific caps.
- Locale is French; do not introduce new user-facing English strings.
- Match existing code style: inline style objects, no CSS modules/Tailwind, `var(--token)` for colors/radii/spacing tokens defined in `src/styles.css`.

---

## Phase 1 — Quick wins

**Note on `DesktopShell.jsx:644`:** the spec listed this `maxWidth:520` banner as a quick win, but on closer reading it's a warning message *inside* an already-centered empty-state block (`items.length === 0`, itself `textAlign:'center', padding:48`), not a page-width container — a bounded-width message bubble inside a centered empty state is correct, not a bug. No task changes it; this is a deliberate scope correction from the spec, not an oversight.

### Task 1: Make Heures.jsx use full desktop width

**Files:**
- Modify: `src/pages/Heures.jsx:1-8` (imports), `:48-67` (component top), `:194-197` (outer wrapper open)
- Modify: `src/pages/Heures.jsx:497-505` (closing tags, to match new wrapper nesting)

**Interfaces:**
- Consumes: `useIsDesktop` from `src/hooks/useIsDesktop.js` — `useIsDesktop(breakpoint = 1024)` returns `boolean`, reactive to window resize.
- Produces: no new exports; internal layout only.

- [ ] **Step 1: Import the hook and compute `isDesktop`**

In `src/pages/Heures.jsx`, change the import block at the top:

```jsx
import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../icons';
import {
  listWorkDays, upsertWorkDay, deleteWorkDay,
  parseHM, segMinutes, dayMinutes, fmtHM, fmtDelta,
  toDayKey, fromDayKey, addDays, mondayOf, isoWeekOf, groupWeeks,
  getTemplate, saveTemplate, getContractHours, saveContractHours,
} from '../lib/workDays';
import { useIsDesktop } from '../hooks/useIsDesktop';
```

Inside `export function Heures() {`, right after `const today = toDayKey(new Date());`, add:

```jsx
  const isDesktop = useIsDesktop();
```

- [ ] **Step 2: Split the return JSX into a desktop two-column grid vs. the existing single-column mobile layout**

Find the current return block:

```jsx
  return (
    <div style={{ minHeight: '100%', background: 'var(--surface)' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '14px 14px 96px' }}>

        {tableMissing && (
```

Replace the two opening wrapper lines with:

```jsx
  return (
    <div style={{ minHeight: '100%', background: 'var(--surface)' }}>
      <div style={{
        padding: isDesktop ? '20px 24px 48px' : '14px 14px 96px',
        display: isDesktop ? 'grid' : 'block',
        gridTemplateColumns: isDesktop ? '420px 1fr' : 'none',
        gap: isDesktop ? 20 : 0,
        alignItems: 'start',
      }}>

        {(tableMissing || loadError) && (
          <div style={{ gridColumn: isDesktop ? '1 / -1' : 'auto' }}>
            {tableMissing && (
```

This wraps the two banners in a full-width grid row on desktop. Now find their closing and the section right after:

```jsx
        {loadError && (
          <div style={{ ...card, background: 'var(--tint-rose)', fontSize: 12.5, color: 'var(--error)' }}>
            Erreur de chargement : {loadError}
          </div>
        )}

        {/* ── Saisie du jour ── */}
        <div style={card}>
```

Replace with:

```jsx
            {loadError && (
              <div style={{ ...card, background: 'var(--tint-rose)', fontSize: 12.5, color: 'var(--error)' }}>
                Erreur de chargement : {loadError}
              </div>
            )}
          </div>
        )}

        {/* ── Saisie du jour (colonne 1 en desktop) ── */}
        <div style={card}>
```

Now find where the "Saisie du jour" card closes and the Stats grid opens:

```jsx
          {saveError && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--error)' }}>{saveError}</div>
          )}
        </div>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
```

Replace with:

```jsx
          {saveError && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--error)' }}>{saveError}</div>
          )}
        </div>

        {/* ── Stats + graphique + réglages (colonne 2 en desktop) ── */}
        <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
```

Finally, find the end of the component — the settings card closing, the loading spinner, and the final closing tags:

```jsx
        {loading && (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Icon.Spinner s={16} c="var(--stone)"/>
          </div>
        )}
      </div>
    </div>
  );
}
```

Replace with:

```jsx
        </div>

        {loading && (
          <div style={{ gridColumn: isDesktop ? '1 / -1' : 'auto', textAlign: 'center', padding: 20 }}>
            <Icon.Spinner s={16} c="var(--stone)"/>
          </div>
        )}
      </div>
    </div>
  );
}
```

Note the extra `<div>` opened before the Stats grid and closed right before the `loading` block — that's the column-2 wrapper holding Stats + Chart + Journée-type together as one grid cell. On mobile (`isDesktop === false`), the outer grid is `display:'block'`, so this extra `<div>` and the `gridColumn` values on the banners/loading block have no visual effect — mobile layout is byte-for-byte the same as before.

- [ ] **Step 3: Manual verification**

Push is deferred to the end of Phase 1 (Task 3). For now just re-read the full modified return block once to confirm every JSX tag opened is closed (React will throw a build error otherwise) — count: outer `<div className=... minHeight>`, inner grid `<div>`, banner wrapper `<div>`, saisie `<div style={card}>`, column-2 wrapper `<div>`, stats grid `<div>`, chart card, settings card. Cross-check against the original file's tag count (nothing removed, two `<div>`s added: the banner wrapper and the column-2 wrapper).

---

### Task 2: Widen Analyse.jsx empty/error state boxes on desktop

**Files:**
- Modify: `src/pages/Analyse.jsx:419` (empty/history state), `:485` (error state)

**Interfaces:**
- Consumes: `isDesktop` (already computed in this file from this session's earlier work — `const isDesktop = useIsDesktop();` near the top of `Analyse()`).
- Produces: none.

- [ ] **Step 1: Widen the empty-state container**

Find:

```jsx
        {!stats && !loading && !error && (
          <div style={{ maxWidth: 420, margin: '40px auto' }}>
```

Replace with:

```jsx
        {!stats && !loading && !error && (
          <div style={{ maxWidth: isDesktop ? 480 : 420, margin: '40px auto' }}>
```

- [ ] **Step 2: Widen the error-state container**

Find:

```jsx
        {error && (
          <div style={{ maxWidth: 420, margin: '40px auto', textAlign: 'center' }}>
```

Replace with:

```jsx
        {error && (
          <div style={{ maxWidth: isDesktop ? 480 : 420, margin: '40px auto', textAlign: 'center' }}>
```

- [ ] **Step 3: Manual verification**

Same as Task 1 — defer live check to end of phase, just confirm the edits compile (matching braces, no stray text).

---

### Task 3: Commit, push, and verify Phase 1

- [ ] **Step 1: Review the diff**

```bash
git diff --stat
git diff src/pages/Heures.jsx src/pages/Analyse.jsx
```

Expected: only `Heures.jsx` and `Analyse.jsx` changed; no unrelated lines touched.

- [ ] **Step 2: Commit**

```bash
git add src/pages/Heures.jsx src/pages/Analyse.jsx
git commit -m "fix: stretch Heures and Analyse layouts to use desktop width

Heures.jsx gets a two-column desktop layout (daily entry card + stats/chart/settings) instead of a 640px centered column. Analyse's empty/error states get a slightly wider box on desktop.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

- [ ] **Step 3: Push**

```bash
git push origin main
```

- [ ] **Step 4: Ask the user to verify**

Ask the user to open the deployed site in a desktop browser window (≥1200px wide), go to **Heures**, and confirm:
1. The daily-entry card sits on the left, roughly 420px wide.
2. The 3 stat cards, the weekly chart, and the "Journée type & contrat" section sit to the right of it, stretching to use the remaining width (not still capped at ~600px total).
3. Resizing the window narrower (down toward 1024px) doesn't visibly break the two-column layout (cards shouldn't overlap or overflow).

Do not proceed to Phase 2 until the user confirms Phase 1 looks right, or reports specific issues to fix first.

---

## Phase 2 — Lower the desktop breakpoint to 768px

### Task 4: Change the mobile/desktop switch threshold

**Files:**
- Modify: `src/App.jsx:141`

**Interfaces:**
- Consumes: `useIsDesktop(breakpoint)` from `src/hooks/useIsDesktop.js`.
- Produces: `isDesktop` boolean used by `App.jsx` to choose between `<DesktopShell/>` and the mobile `<BrowserRouter>` tree.

- [ ] **Step 1: Change the breakpoint**

Find:

```jsx
  const isDesktop = useIsDesktop(1024);
```

Replace with:

```jsx
  const isDesktop = useIsDesktop(768);
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: activate DesktopShell at 768px instead of 1024px

Closes the tablet-width gap where neither the mobile .app-shell nor DesktopShell were designed for the viewport, per docs/superpowers/specs/2026-07-08-responsive-audit-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

Do not push yet — Task 5 must land first, since dropping the breakpoint alone makes the detail panel overlap content between 768–1023px (see Task 5).

---

### Task 5: Make the detail panel an overlay below 1024px

**Files:**
- Modify: `src/pages/DesktopShell.jsx:1` (imports), `:302` (`DetailPanel` signature), `:374-423` (three `DetailPanel` return branches), `:697` (component top), `:1143-1149` (detail panel render site)

**Interfaces:**
- Consumes: `useIsDesktop` from `src/hooks/useIsDesktop.js`.
- Produces: `DetailPanel` now accepts an `overlay: boolean` prop (default `false`, i.e. existing column behavior unchanged when omitted).

- [ ] **Step 1: Import the hook**

Find:

```jsx
import React, { useEffect, useState } from 'react';
```

Replace with:

```jsx
import React, { useEffect, useState } from 'react';
import { useIsDesktop } from '../hooks/useIsDesktop';
```

- [ ] **Step 2: Add an `overlay` prop and a shared style helper to `DetailPanel`**

Find:

```jsx
function DetailPanel({ product, onUpdate, onClose }) {
```

Replace with:

```jsx
function DetailPanel({ product, onUpdate, onClose, overlay }) {
  const panelFrame = overlay
    ? { position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(380px, 92vw)', zIndex: 60, boxShadow: 'var(--sh-3)' }
    : { width: 380, flexShrink: 0, borderLeft: '0.5px solid var(--hairline)' };
```

- [ ] **Step 3: Use `panelFrame` in the empty-state branch**

Find:

```jsx
  // Empty state
  if (!product) {
    return (
      <div style={{
        width: 380, flexShrink: 0,
        borderLeft: '0.5px solid var(--hairline)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, color: 'var(--steel)', fontSize: 13,
        background: 'var(--canvas)', textAlign: 'center', lineHeight: 1.6,
      }}>
```

Replace with:

```jsx
  // Empty state
  if (!product) {
    return (
      <div style={{
        ...panelFrame,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, color: 'var(--steel)', fontSize: 13,
        background: 'var(--canvas)', textAlign: 'center', lineHeight: 1.6,
      }}>
```

- [ ] **Step 4: Use `panelFrame` in the not-found branch**

Find:

```jsx
  // Not found state
  if (product.notFound) {
    return (
      <div style={{
        width: 380, flexShrink: 0,
        borderLeft: '0.5px solid var(--hairline)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, background: 'var(--canvas)', textAlign: 'center',
      }}>
```

Replace with:

```jsx
  // Not found state
  if (product.notFound) {
    return (
      <div style={{
        ...panelFrame,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, background: 'var(--canvas)', textAlign: 'center',
      }}>
```

- [ ] **Step 5: Use `panelFrame` in the main branch**

Find:

```jsx
  return (
    <div style={{
      width: 380, flexShrink: 0,
      borderLeft: '0.5px solid var(--hairline)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', overflow: 'hidden',
    }}>
```

Replace with:

```jsx
  return (
    <div style={{
      ...panelFrame,
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', overflow: 'hidden',
    }}>
```

- [ ] **Step 6: Compute `showPanelAsColumn` in `DesktopShell`**

Find:

```jsx
export function DesktopShell() {
```

Replace with:

```jsx
export function DesktopShell() {
  const showPanelAsColumn = useIsDesktop(1024);
```

- [ ] **Step 7: Render the panel as a column above 1024px, or as an overlay-with-backdrop below it**

Find:

```jsx
          {/* Detail panel */}
          {activeNav !== 'heures' && (
            <DetailPanel
              product={selectedProduct}
              onUpdate={handleUpdate}
              onClose={() => setSelectedProduct(null)}
            />
          )}
        </div>
```

Replace with:

```jsx
          {/* Detail panel: persistent column ≥1024px, overlay below that */}
          {activeNav !== 'heures' && (showPanelAsColumn || selectedProduct) && (
            <>
              {!showPanelAsColumn && (
                <div
                  onClick={() => setSelectedProduct(null)}
                  style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 55 }}
                />
              )}
              <DetailPanel
                product={selectedProduct}
                onUpdate={handleUpdate}
                onClose={() => setSelectedProduct(null)}
                overlay={!showPanelAsColumn}
              />
            </>
          )}
        </div>
```

Below 1024px, the panel only mounts when a product is actually selected (no permanent empty 380px column eating into the narrow content area), and a semi-transparent backdrop closes it on click, matching common slide-over UX.

- [ ] **Step 8: Commit**

```bash
git add src/pages/DesktopShell.jsx
git commit -m "feat: render product detail panel as an overlay below 1024px

Keeps the persistent 380px column at ≥1024px (unchanged), but between the new 768px DesktopShell threshold and 1024px there isn't room for sidebar + table + a permanent 380px column, so the panel becomes a slide-over with a click-to-close backdrop instead.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: Push Phase 2 and verify across the new width range

- [ ] **Step 1: Push both Phase 2 commits**

```bash
git push origin main
```

- [ ] **Step 2: Ask the user to verify at four widths**

Ask the user to resize their desktop browser (or use DevTools responsive mode) to each of these widths on the live site and report anything cramped, overlapping, or clipped:
- **768px** — `DesktopShell` should now appear (sidebar + table), not the mobile layout. No detail panel column should show by default (only sidebar + table filling the rest).
- **900px** — same, still no persistent detail panel; clicking a row should slide the detail panel in as an overlay with a dark backdrop behind it, closable by clicking the backdrop or the panel's own close button.
- **1024px** — the detail panel should now show as a persistent third column (no backdrop, no overlay) — this is the existing pre-Phase-2 behavior, should be unchanged from before this work started.
- **1280px** — same as 1024px, confirm nothing regressed.

- [ ] **Step 3: Fix anything reported before moving to Phase 3**

If the user reports a specific cramped element (e.g. a column truncating text, a button wrapping badly) at one of these widths, make a targeted fix to that element only (add `minWidth`, adjust a `gridTemplateColumns`/flex-basis, etc. — mirror the pattern already used at the reported spot), commit, push, and re-verify that specific width before continuing.

---

## Phase 3 — Small-phone verification (320–375px)

### Task 7: Check and fix narrow-phone rendering

**Files:**
- Modify (only if issues found): `src/pages/Heures.jsx` (stat grid, `:355`), `src/pages/Analyse.jsx` (`MiniTable` column widths, various `width:'Npx'` entries in the `columns` arrays throughout the file)

**Interfaces:**
- None new — this task only touches existing inline styles.

- [ ] **Step 1: Check Heures.jsx at 320px and 375px**

Resize the browser (or DevTools device toolbar) to 320px width, open **Heures** on mobile (not `DesktopShell` — this is the `.app-shell` mobile layout). Look at the 3-stat-card row (`This week / Avg / Cumul`, from `src/pages/Heures.jsx:355`, `gridTemplateColumns: 'repeat(3, 1fr)'`). Check whether the mono-font numeric values (e.g. `39h05`) or the card labels wrap awkwardly or get clipped.

If clipped/wrapped badly: reduce the card padding at narrow widths or drop to a 2-column + 1 full-width row layout. Concrete fix if needed (only apply if Step 1 finds an actual problem):

Find (`src/pages/Heures.jsx:355`, inside the JSX, not the desktop-grid wrapper added in Task 1):

```jsx
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
```

Replace with:

```jsx
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8, marginBottom: 12 }}>
```

`auto-fit` with a `minmax` floor lets the grid drop to fewer columns automatically once 96px per card no longer fits three across, instead of squeezing three fixed columns into a viewport too narrow for them.

- [ ] **Step 2: Check Analyse.jsx at 320px and 375px**

Note: `Analyse` on mobile below 1024px currently only renders inside `.app-shell`'s 520px cap (unaffected by the Phase 2 breakpoint change, since `Analyse` itself isn't part of `DesktopShell`'s sidebar chrome). Resize to 320px, open **Analyse rayon**, load or view a saved CSV, and check the `MiniTable` columns (e.g. `src/pages/Analyse.jsx:592-595`'s "Meilleures ventes" table has 7 columns with widths like `'110px'`, `'75px'`, `'100px'`, `'60px'`, `'60px'` plus the flexible `designation` column and the EAN column) — at 320px total viewport width minus padding, these fixed widths likely force horizontal overflow.

This is expected and acceptable *if* the table scrolls horizontally without breaking the page layout — `MiniTable`'s outer container (`src/pages/Analyse.jsx:99`, `<div style={{ maxHeight: ..., overflowY: 'auto' }}>`) does not currently set `overflowX`, so confirm whether the table scrolls the whole page horizontally (bad) or stays contained. If the whole mobile page scrolls horizontally: fix by adding horizontal scroll containment.

Concrete fix if needed:

Find (`src/pages/Analyse.jsx`, the `MiniTable` function, its outer return):

```jsx
  return (
    <div style={{ fontSize: compact ? 12 : 13 }}>
```

Replace with:

```jsx
  return (
    <div style={{ fontSize: compact ? 12 : 13, overflowX: 'auto' }}>
```

This contains the table's own horizontal scroll to the table itself instead of letting it push the whole page wider than the viewport.

- [ ] **Step 3: Sanity-check the rest of the mobile pages**

At 320px, quickly open **Affiche**, **Catalogue**, **Scanner** and confirm nothing else clips or overflows. These weren't flagged by the code audit (no fixed-px grid/columns found in them), so this is a spot-check, not an expected-fix step.

- [ ] **Step 4: Commit whatever was actually changed**

Only commit if Steps 1–3 found real issues and you applied fixes. If nothing needed to change, skip this task's commit entirely — do not commit a no-op.

```bash
git add src/pages/Heures.jsx src/pages/Analyse.jsx
git commit -m "fix: contain narrow-phone overflow in Heures stat grid and Analyse tables

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
git push origin main
```

- [ ] **Step 5: Final confirmation**

Ask the user to do one more pass on their own phone (or DevTools at 320/375px) across Affiche, Catalogue, Heures, Analyse, Scanner, and confirm the responsive work is done.
