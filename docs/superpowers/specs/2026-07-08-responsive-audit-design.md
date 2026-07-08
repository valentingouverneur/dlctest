# Responsive audit & improvements

Date: 2026-07-08

## Problem

The app has two hand-built layout modes — a mobile `.app-shell` (capped at
520px, centered) below 1024px, and `DesktopShell` (sidebar + table) at
1024px+ — with nothing tailored to the 768–1024px range in between, and at
least one page (`Heures.jsx`) dropped into `DesktopShell` unmodified, so it
stays capped at a narrow centered column and leaves large empty gutters on
wide screens. The user wants a real pass on responsive behavior across the
whole site, not just the one page they noticed.

## Audit findings

**Systemic**

1. **Tablet gap (768–1024px) is unhandled.** `.app-shell` (`src/styles.css:111`)
   stays at `max-width:520px` the whole way up to the `useIsDesktop(1024)`
   threshold (`src/hooks/useIsDesktop.js`, consumed in `src/App.jsx:141`).
   On an iPad-class screen this leaves up to ~500px of dead space, even
   though `.app-shell` grows a box-shadow/border treatment at 768px
   (`src/styles.css:119-126`) that implies a deliberate breakpoint was
   intended there and never finished.
2. **Mobile-first pages reused inside `DesktopShell` without adaptation.**
   `Heures.jsx:196` hardcodes `maxWidth:640, margin:'0 auto'` with no
   `useIsDesktop` branching at all, despite being rendered directly inside
   `DesktopShell` (`DesktopShell.jsx:1094`). `Analyse.jsx`'s empty/error
   sub-screens (`:419`, `:485`) have the same `maxWidth:420` pattern (the
   page's main layout was already made desktop-aware this session, but
   these two sub-states were missed). `DesktopShell.jsx:644` has an
   unrelated banner hardcoded to `maxWidth:520` that doesn't match the
   full-width view it sits in.
3. **Only `App.jsx` and `Analyse.jsx` import `useIsDesktop`.** Every other
   page component assumes it only ever renders inside `.app-shell`. That's
   true for `Affiche.jsx`, `Catalogue.jsx`, `Product.jsx`, `Scanner.jsx` —
   `DesktopShell` reimplements its own table/detail views for those rather
   than reusing the mobile components, so they're out of scope here.
   `Heures.jsx` is the one exception that got special-cased into
   `DesktopShell` without the same treatment.

**Already fine, no action needed**

- `DesktopShell`'s own table grid (`GRID`, `DesktopShell.jsx:15`) and the
  DLC grid (`:671`) use `fr` units and a flexible content pane (no
  `maxWidth` on `:1080`), so they already stretch correctly across desktop
  widths.
- Sidebar (220px) and detail panel (380px) are intentionally fixed-width;
  confirmed out of scope — no ultra-wide optimization requested.
- `Scanner.jsx` is already full-viewport (`position:fixed, inset:0` +
  safe-area insets), no changes needed.

**Unverified / lower priority**

- Small-phone (320–375px) risk: `Heures.jsx`'s 3-column stat grid
  (`:355`, `repeat(3,1fr)`) and `Analyse.jsx`'s `MiniTable` fixed-px column
  widths are candidates for clipping/overflow on the smallest phones —
  needs an actual narrow-viewport check, not just a code read.

## Decisions

- **Desktop-fill direction:** pages that don't fill the screen on desktop
  should stretch their content into a wider layout (grid/flex that uses
  available width), not just get a bigger centered column.
- **Tablet gap fix:** lower the `DesktopShell` activation threshold from
  1024px to 768px, rather than growing `.app-shell` to fill the gap. Reuses
  the existing, already-responsive `DesktopShell` layout instead of adding
  a third layout mode.
- **Ultra-wide (2560px+):** out of scope — current `fr`-based stretching is
  acceptable, no cap needed.
- **Delivery:** three sequential phases, each committed, pushed, and
  visually confirmed by the user on the live Vercel deployment before the
  next phase starts.

## Phase 1 — Quick wins

Low risk, single-file changes:

- `Heures.jsx`: add `useIsDesktop` awareness (same pattern as `Analyse.jsx`
  from this session). On desktop, stop capping the page at `maxWidth:640`;
  let the 3-stat-card row and the weekly chart stretch to use available
  width. The daily-entry form card stays a bounded width (a very wide time
  entry form would be harder to use), but is no longer forced into the
  same narrow column as the stats/chart.
- `Analyse.jsx`: apply the same `isDesktop` treatment to the empty-state
  and error-state blocks (`:419`, `:485`) that was applied to the main
  layout earlier this session, for consistency.
- `DesktopShell.jsx:644`: remove the stray `maxWidth:520` on the warning
  banner so it matches the full-width view around it.

## Phase 2 — Lower the desktop breakpoint to 768px

- Change `useIsDesktop(1024)` → `useIsDesktop(768)` in `App.jsx` (the only
  call site that decides mobile vs. `DesktopShell`).
- Check the detail panel (380px fixed) and sidebar (220px fixed) against a
  768px-wide viewport: 220 + 380 = 600px of fixed chrome leaves only
  ~168px for the content pane, which is too tight. Expected fix: hide the
  detail panel (or render it as an overlay instead of a third column) below
  some width threshold — determine the right threshold during
  implementation by checking real DesktopShell content at 768–900px, don't
  assume a specific pixel value up front.
- Re-check all `DesktopShell` views (Affiche, Catalogue, DLC, Analyse,
  Heures, Settings) at 768px and 900px widths for cramped columns or
  overlapping elements now that they're reachable at a narrower width than
  before.

## Phase 3 — Small-phone verification (320–375px)

- Resize a browser to 320px and 375px against the deployed site and check:
  `Heures.jsx` 3-column stat grid, `Analyse.jsx` `MiniTable` fixed-width
  columns (multiple `width:'110px'`-style columns per table), and the rest
  of the mobile pages as a sanity pass.
- Fix any clipping/overflow found with targeted, minimal changes (e.g.
  reducing column count or switching fixed px widths to more flexible
  units) — this phase is verification-driven, not a redesign, so scope is
  whatever the actual check turns up.

## Testing

No local dev server / automated visual testing available in this
environment. Each phase is pushed to `main` (auto-deploys via Vercel) and
the user confirms visually on the live site before the next phase starts.
