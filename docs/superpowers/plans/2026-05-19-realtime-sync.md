# Realtime Sync — Affiche Desktop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a new scan is inserted on mobile, the desktop Affiche prepends the product live without any page refresh.

**Architecture:** A dedicated `useEffect` in `DesktopShell` subscribes to `INSERT` events on the Supabase `scans` table via Realtime Postgres Changes. On event, it fetches the product (Supabase → OFF fallback → bare EAN placeholder), deduplicates, and prepends to `afficheItems`. The channel is torn down when the user navigates away from Affiche.

**Tech Stack:** React 18 hooks, Supabase JS client (`supabase.channel` / `postgres_changes`), existing `getProductByEan`, `fetchFromOFF`, `searchPackshots` helpers.

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/pages/DesktopShell.jsx` |
| Supabase prerequisite | SQL Editor in Supabase dashboard (one-time) |

---

### Task 1: Enable Realtime on the `scans` table in Supabase

Supabase does not broadcast changes for a table unless it is added to the `supabase_realtime` publication. This is a one-time dashboard step.

**Files:** none (Supabase dashboard only)

- [ ] **Step 1: Open the Supabase SQL Editor**

Go to your Supabase project dashboard → SQL Editor → New query.

- [ ] **Step 2: Run the publication command**

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE scans;
```

Expected output: `ALTER PUBLICATION` (no error).

- [ ] **Step 3: Verify**

In the Supabase dashboard go to Database → Replication. The `scans` table should appear in the `supabase_realtime` publication list.

---

### Task 2: Add the realtime subscription `useEffect` to `DesktopShell`

**Files:**
- Modify: `src/pages/DesktopShell.jsx`

The `DesktopShell` component already imports `supabase`, `getProductByEan`, `fetchFromOFF`, and `searchPackshots`. No new imports are needed.

- [ ] **Step 1: Locate the insertion point**

Open `src/pages/DesktopShell.jsx`. Find the block of `useEffect` hooks inside `export function DesktopShell()`. The last one is the affiche loader (starts with `if (activeNav !== 'affiche') return;`). Add the new effect **after** that block.

- [ ] **Step 2: Add the subscription effect**

```jsx
// Realtime: prepend new scans as they arrive
useEffect(() => {
  if (activeNav !== 'affiche') return;

  const channel = supabase
    .channel('scans-realtime')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'scans' },
      async ({ new: row }) => {
        const ean = row.ean;

        // Fetch full product data using same fallback chain as loadAffiche
        const p =
          (await getProductByEan(ean).catch(() => null)) ??
          (await fetchFromOFF(ean).catch(() => null)) ??
          { ean, title: ean, brand: null, weight: null, image_url: null, category: null, packshots: [] };

        // Prepend, deduplicating by EAN
        setAfficheItems(prev => [{ ...p, packshots: p.packshots ?? [] }, ...prev.filter(x => x.ean !== ean)]);

        // Auto-select if nothing is selected
        setSelectedProduct(sel => sel === null ? p : sel);

        // Fire-and-forget Bing packshot fetch
        if (!p.image_url && p.title !== ean) {
          searchPackshots(p.title, p.brand)
            .then(shots => {
              if (shots.length) {
                setAfficheItems(prev =>
                  prev.map(it => it.ean === ean ? { ...it, packshots: shots } : it)
                );
              }
            })
            .catch(() => {});
        }
      }
    )
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [activeNav]);
```

- [ ] **Step 3: Verify the dev server starts cleanly**

```bash
npm run dev
```

Expected: Vite starts on http://localhost:5173 with no console errors. Open the desktop view (window width ≥ 1024px) and navigate to Affiche — no errors in the browser console.

- [ ] **Step 4: Commit**

```bash
git add src/pages/DesktopShell.jsx
git commit -m "feat: realtime prepend new scans in desktop Affiche"
```

---

### Task 3: Manual end-to-end verification

**Files:** none

- [ ] **Step 1: Open the desktop app**

Run `npm run dev`. Open http://localhost:5173 in a browser at ≥ 1024px width. Navigate to Affiche. Open the browser DevTools Network tab and filter on `realtime` — you should see an active WebSocket connection to Supabase.

- [ ] **Step 2: Simulate a new scan**

In the Supabase dashboard → Table Editor → `scans` → Insert row. Enter any valid EAN (e.g. `3017620422003`) and set `scanned_at` to now.

- [ ] **Step 3: Observe the Affiche**

Within ~1 second the new product should appear at the top of the Affiche table without any page refresh. If the EAN exists in the catalogue, the full product row (packshot, title, brand) appears. If not, an EAN-only placeholder appears first, then enriches.

- [ ] **Step 4: Verify deduplication**

Insert the same EAN again in the Supabase dashboard. The item should move to the top of the list — not appear twice.

- [ ] **Step 5: Verify channel cleanup**

Click "Catalogue" in the sidebar. In DevTools → Network → WS, the channel should unsubscribe (no new messages). Click back to "Affiche" — the channel re-subscribes.
