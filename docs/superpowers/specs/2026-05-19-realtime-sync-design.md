# Realtime Sync — Affiche Desktop

**Date:** 2026-05-19
**Scope:** Desktop Affiche auto-updates when a new scan is inserted on mobile

## Context

Currently the desktop Affiche loads scan history once on mount. If the user scans a product on mobile while the desktop is open, the new item only appears after a manual page refresh. This feature makes the Affiche live.

## Constraints

- Solo user (one person, mobile scanner + desktop dashboard)
- Only new scans need to sync — product edits do not
- Must not break the existing initial load flow

## Approach: Targeted Prepend via Supabase Realtime

Subscribe to `INSERT` events on the `scans` table using a dedicated `useEffect` in `DesktopShell`. On event, fetch the product and prepend it to `afficheItems`.

## Data Flow

1. Mobile scans product → `insertScan(ean)` → INSERT in `scans` table
2. Supabase pushes event to desktop client via WebSocket
3. Desktop receives `payload.new.ean`
4. Fetch product: Supabase → Open Food Facts fallback → bare EAN placeholder
5. Deduplicate: if EAN already in list, move to top; otherwise prepend
6. Fire-and-forget Bing packshot fetch (same pattern as existing `loadAffiche`)
7. Auto-select new item if nothing is currently selected

## Implementation

**File:** `src/pages/DesktopShell.jsx` — add one `useEffect`

```js
useEffect(() => {
  if (activeNav !== 'affiche') return;
  const channel = supabase
    .channel('scans-realtime')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scans' },
      async ({ new: row }) => {
        const ean = row.ean;
        const p = await getProductByEan(ean).catch(() => null)
          ?? await fetchFromOFF(ean).catch(() => null)
          ?? { ean, title: ean, brand: null, weight: null, image_url: null, category: null, packshots: [] };
        setAfficheItems(prev => [p, ...prev.filter(x => x.ean !== ean)]);
        setSelectedProduct(sel => sel === null ? p : sel);
        if (!p.image_url && p.title !== ean) {
          searchPackshots(p.title, p.brand).then(shots => {
            if (shots.length) setAfficheItems(prev =>
              prev.map(it => it.ean === ean ? { ...it, packshots: shots } : it));
          }).catch(() => {});
        }
      })
    .subscribe();
  return () => { supabase.removeChannel(channel); };
}, [activeNav]);
```

## Supabase Prerequisite

Run once in the Supabase SQL Editor:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE scans;
```

## What Does Not Change

- Initial `loadAffiche` logic — untouched
- `scans` table schema — no migration needed
- Mobile Scanner — no changes
- Product editing / DetailPanel — unaffected
