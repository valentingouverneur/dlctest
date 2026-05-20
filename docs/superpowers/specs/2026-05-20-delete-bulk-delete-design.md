# Delete & Bulk Delete — Design Spec

**Date:** 2026-05-20
**Scope:** Single product delete from detail panel + multi-select bulk delete in catalogue/affiche table

## Context

Currently there is no way to remove a product from the catalogue. Wrong entries, test products, and duplicates accumulate with no cleanup path. This feature adds:
- Single delete from the detail panel
- Multi-row checkbox selection with bulk delete

## Approach: Checkbox Column + Bulk Action Bar

Checkboxes added as a first column in every table row. A bulk action bar appears between the toolbar and the table when any rows are selected. Single delete lives in the `DetailPanel` header with an inline two-click confirmation. Both paths call the same `deleteProduct` function.

## Data Layer

**New function in `src/lib/products.js`:**

```js
export async function deleteProduct(ean) {
  const { error } = await supabase.from('products').delete().eq('ean', ean);
  if (error) throw error;
}
```

## UI — Table

**GRID constant** (updated):
```
'20px 56px 1.8fr 1fr 88px 148px 118px'
```
First column (20px) holds the checkbox.

**`TableHeader`** — first cell is a "select all" checkbox. Checked when all visible rows are selected; unchecked otherwise. Clicking it toggles all visible rows.

**`TableRow`** — first cell is a checkbox (`<input type="checkbox">`). Click on the checkbox toggles selection (stopPropagation prevents row click from also opening the detail panel). Click anywhere else on the row opens the detail panel as before.

## UI — Bulk Action Bar

Renders between the toolbar and the table when `selectedEans.size > 0`.

```
┌─────────────────────────────────────────────────────┐
│  ✓ 3 produit(s) sélectionné(s)   [Supprimer 3]  [✕] │
└─────────────────────────────────────────────────────┘
```

- "Supprimer N" button label acts as its own confirmation (explicit count).
- [✕] clears the selection without deleting.
- On delete: calls `deleteProduct` for each selected EAN in parallel (`Promise.all`), removes them from `products`/`afficheItems` state, clears selection, closes detail panel if selected product was among deleted.

## UI — Detail Panel

"Supprimer" button added in the header row next to "Corriger". Two-click inline confirmation:
- First click: button label changes to `"Confirmer ?"` (red tint)
- Second click: executes delete
- Click elsewhere / 3s timeout: resets to "Supprimer"

On success: removes product from list, clears `selectedProduct`, closes panel.

## State

**`selectedEans`** — `useState(new Set())` in `DesktopShell`.

Updates always create a new Set:
```js
setSelectedEans(prev => { const s = new Set(prev); s.add(ean); return s; });
setSelectedEans(prev => { const s = new Set(prev); s.delete(ean); return s; });
```

**Clearing selection:**
- On tab change (`handleNav`)
- After bulk delete completes
- When [✕] is clicked

## Error Handling

- Delete errors surface as an inline error message in the bulk bar or detail panel (same pattern as existing save errors).
- Partial bulk delete failure: products that failed remain in the list; selection retains only failed EANs.

## What Does Not Change

- `searchProducts`, `updateProduct`, `createProduct` — untouched
- Mobile views — unaffected (delete is desktop-only)
- Scanner — unaffected
