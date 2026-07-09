# Mobile DLC Calendar page

Date: 2026-07-09

## Problem

The desktop app has a full "Calendrier DLC" view (`DlcDesktopView` in
`src/pages/DesktopShell.jsx:569-695`) — a synced list of tracked
expiry-date entries with status management (mark done/reopen, delete).
Mobile has no equivalent: no `/dlc` route, no menu entry. The only mobile
touchpoint is `DlcQuickSheet` (`src/pages/DlcQuickSheet.jsx`), a bottom
sheet reachable from the Scanner that lets you *add* an entry — there is
no way to *view or manage* the list on mobile at all. This was surfaced
during the responsive-audit work (`2026-07-08-responsive-audit-design.md`)
while comparing the desktop sidebar's nav items against the mobile
drawer's — desktop has "Calendrier DLC" and "Paramètres" that mobile
lacks; "Paramètres" is an unimplemented stub ("Paramètres à venir.") so
that gap is a non-issue, but "Calendrier DLC" is a real, working feature
missing from mobile entirely.

## Decisions

- **Layout:** stacked cards (matching the existing `Affiche` mobile card
  pattern — thumbnail + text), not a dense table-row list. A 6-column
  desktop table row (`DesktopShell.jsx:672`, `gridTemplateColumns: '44px
  1.6fr 110px 70px 120px 180px'`) has no equivalent mobile layout; cards
  are this app's established mobile pattern for product-like lists.
- **Grouping:** cards grouped into urgency sections — **Aujourd'hui**,
  **Demain**, **Bientôt**, **Plus tard** (using the existing
  `getDlcUrgency()` categories from `lib/dlcItems.js:226`) — rather than
  one flat date-sorted list, so what's urgent is visible without
  scrolling past older/less-pressing entries.
- **Completed items:** items with `status !== 'a_traiter'` (i.e. "fait")
  go into a separate **Terminées** section, collapsed by default
  (tap to expand) — kept out of the urgency groups entirely, rather than
  staying in-place dimmed (desktop's current behavior, `opacity: done ?
  0.62 : 1` at `DesktopShell.jsx:674`). Desktop's in-place-dimmed
  behavior is unaffected by this — this decision is mobile-only.
- **Actions:** tap targets (a "Fait"/"Rouvrir" button and a delete
  button on each card), not swipe gestures. Matches how every other page
  in this app handles per-item actions (no page currently uses swipe);
  introducing swipe here would be the app's first, for one page, adding
  gesture-conflict and testing risk for no clearly requested benefit.
- **Shared enrichment logic:** the automatic detail-completion logic
  currently inlined in `DlcDesktopView` (`enrichItem`, `DesktopShell.jsx:
  574-602` — backfills title/brand/weight/category/image via Supabase →
  Open Food Facts → packshot search, then persists via
  `updateDlcItemDetails`) moves to `lib/dlcItems.js` as an exported
  `enrichDlcItem(item)`, so the new mobile page and the existing desktop
  view share one implementation instead of duplicating a non-trivial
  async chain. `DlcDesktopView` is updated to import and call the moved
  function instead of keeping its own copy.

## New page: `src/pages/Dlc.jsx`

**Route & nav:**
- `src/App.jsx`: add `<Route path="/dlc" element={<Dlc/>}/>` to the
  mobile `Routes` block, and a drawer entry `{ id: '/dlc', label:
  'Calendrier DLC', icon: ... }` using the existing `Icon.Calendar`,
  positioned right after Catalogue (matching desktop sidebar order:
  Affiche, Catalogue, Calendrier DLC, Analyse rayon, Heures — mobile
  additionally has Scanner, which desktop intentionally lacks per this
  session's earlier decision that scanning stays phone-only).
- The mobile header title mapping in `App.jsx` already has a stale
  `{location.pathname === '/dlc' && 'Calendrier DLC'}` line
  (`App.jsx:202` per the audit) that has never been reachable — this
  page makes it reachable; no title-mapping change needed.

**Data flow:**
- On mount: call `getDlcItemsAsync()`, then run `enrichDlcItem` over the
  results the same way `DlcDesktopView.refresh()` does today, and surface
  `getLastDlcSyncError()` for the "Supabase not configured" banner.
- A "Rafraîchir" action in the page header re-runs the same load.
- `setStatus(id, status)` → `updateDlcItemStatus`; `remove(id)` →
  `deleteDlcItem`; both re-run the load afterward, matching
  `DlcDesktopView`'s existing `setStatus`/`remove` pattern.

**Rendering:**
- Empty state (`items.length === 0`): same copy as desktop's empty state
  (`DesktopShell.jsx:639-654`) — "Aucune DLC enregistrée" /
  "Chargement…", the Supabase-missing banner, and the same "scan then
  tap DLC" hint text — reusing the same message, adapted to the mobile
  card-and-`.app-shell` visual style instead of the desktop centered
  block.
- Non-empty state: four urgency sections in order (Aujourd'hui, Demain,
  Bientôt, Plus tard), each only rendered if it has at least one
  `a_traiter` item; a final "Terminées (n)" section, collapsed by
  default, listing all `status !== 'a_traiter'` items when expanded.
- Card content: `Packshot` thumbnail (reusing the primitive, same props
  pattern as `DlcDesktopView.676`), title, `brand · weight · ean` line,
  expiry date, zone (if set), status badge (same color mapping as
  `urgencyMeta()`, `DesktopShell.jsx:631-637`), and the two action
  buttons.

## Out of scope

- No changes to `DlcQuickSheet.jsx` (the add-entry sheet from Scanner) —
  it already works and isn't part of this gap.
- No changes to `DlcDesktopView`'s visual layout or behavior beyond
  importing the moved `enrichDlcItem` instead of its inline copy — same
  table-row UI, same in-place-dimmed completed items.
- No swipe gestures, no drag-reorder, no filtering/search within the DLC
  list — YAGNI until asked for.

## Testing

No automated test runner in this project. Verified manually on the live
Vercel deployment after push, same as the responsive-audit work earlier
this session — no local dev server available in this environment.
