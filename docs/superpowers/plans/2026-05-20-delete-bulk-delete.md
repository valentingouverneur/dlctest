# Delete & Bulk Delete Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add single-product delete from the detail panel and multi-row checkbox selection with bulk delete in the desktop catalogue/affiche table.

**Architecture:** `deleteProduct(ean)` added to the data layer. A checkbox column added to `TableRow`/`TableHeader` drives a `selectedEans` Set in `DesktopShell`. A bulk action bar appears when selection is non-empty. `DetailPanel` gets a two-click inline delete button via a new `onDelete` prop.

**Tech Stack:** React 18 hooks, Supabase JS client, inline styles (no CSS modules).

---

## File Map

| Action | File |
|--------|------|
| Modify | `src/lib/products.js` |
| Modify | `src/pages/DesktopShell.jsx` |

---

### Task 1: Add `deleteProduct` to the data layer

**Files:**
- Modify: `src/lib/products.js`

- [ ] **Step 1: Add `deleteProduct` after `updateProduct`**

Open `src/lib/products.js`. After the `updateProduct` export (ends around line 57), add:

```js
export async function deleteProduct(ean) {
  const { error } = await supabase.from('products').delete().eq('ean', ean);
  if (error) throw error;
}
```

- [ ] **Step 2: Verify manually**

Open the Supabase dashboard → Table Editor → `products`. Note any product's EAN. In the browser console on the running app (`npm run dev`), run:

```js
import('/src/lib/products.js').then(m => m.deleteProduct('YOUR_TEST_EAN').then(() => console.log('deleted')).catch(console.error))
```

Expected: `"deleted"` logged; row gone in Supabase dashboard. (Restore the row after testing if needed.)

- [ ] **Step 3: Commit**

```bash
git add src/lib/products.js
git commit -m "feat: add deleteProduct to data layer"
```

---

### Task 2: Checkbox column + selection state

**Files:**
- Modify: `src/pages/DesktopShell.jsx`

This task adds the checkbox column visually and wires up selection state. No delete logic yet.

- [ ] **Step 1: Update the `deleteProduct` import**

Find the existing import at the top of `src/pages/DesktopShell.jsx`:

```js
import { searchProducts, getProductByEan, updateProduct, createProduct } from '../lib/products';
```

Replace with:

```js
import { searchProducts, getProductByEan, updateProduct, createProduct, deleteProduct } from '../lib/products';
```

- [ ] **Step 2: Update the `GRID` constant**

Find:
```js
const GRID = '56px 1.8fr 1fr 88px 148px 118px';
```

Replace with:
```js
const GRID = '20px 56px 1.8fr 1fr 88px 148px 118px';
```

- [ ] **Step 3: Replace `TableHeader` with the checkbox version**

Find the entire `TableHeader` function and replace it:

```jsx
function TableHeader({ allSelected, onSelectAll }) {
  const cell = (label, extra = {}) => (
    <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', color: 'var(--stone)', textTransform: 'uppercase', ...extra }}>
      {label}
    </div>
  );
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: GRID,
      alignItems: 'center', gap: 12,
      padding: '0 16px', height: 32,
      borderBottom: '0.5px solid var(--hairline-strong)',
      background: 'var(--canvas)',
      position: 'sticky', top: 0, zIndex: 1,
    }}>
      <input
        type="checkbox"
        checked={allSelected}
        onChange={onSelectAll}
        style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: 14, height: 14 }}
      />
      {cell('Titre')}
      {cell('Marque')}
      {cell('Poids')}
      {cell('EAN')}
      {cell('Catégorie', { textAlign: 'right' })}
    </div>
  );
}
```

- [ ] **Step 4: Replace `TableRow` with the checkbox version**

Find the entire `TableRow` function and replace it:

```jsx
function TableRow({ product, selected, onSelect, checked, onToggle }) {
  const [modalSrc, setModalSrc] = useState(null);

  const openImage = (e) => {
    e.stopPropagation();
    const src = product.image_url || product.packshots?.[0];
    if (src) setModalSrc(src);
  };

  const hasImage = !!(product.image_url || product.packshots?.[0]);

  return (
    <>
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)}/>}
      <div
        onClick={() => onSelect(product)}
        style={{
          display: 'grid', gridTemplateColumns: GRID,
          alignItems: 'center', gap: 12,
          padding: '0 16px', height: 48,
          borderBottom: '0.5px solid var(--hairline)',
          background: selected || checked ? 'var(--tint-lavender)' : 'transparent',
          cursor: 'pointer', fontSize: 13, userSelect: 'none',
          transition: 'background 0.07s',
        }}
        onMouseEnter={e => { if (!selected && !checked) e.currentTarget.style.background = 'rgba(20,18,14,0.026)'; }}
        onMouseLeave={e => { if (!selected && !checked) e.currentTarget.style.background = 'transparent'; }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => {}}
          onClick={e => { e.stopPropagation(); onToggle(product.ean); }}
          style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: 14, height: 14 }}
        />
        <div onClick={openImage} style={{ cursor: hasImage ? 'zoom-in' : 'default' }}>
          <Packshot
            product={{ title: product.title, brand: product.brand, cat: catDisplayLabel(product.category), imageUrl: product.image_url || product.packshots?.[0] }}
            size={40} radius={4} hint={false}
          />
        </div>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--charcoal)', fontWeight: 450 }}>
          {product.title}
        </div>
        <div style={{ color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.brand}</div>
        <div style={{ color: 'var(--slate)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{product.weight}</div>
        <div style={{ color: 'var(--steel)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{product.ean}</div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Pill tone={catTone(product.category)}>{product.category || '—'}</Pill>
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 5: Add `selectedEans` state and handlers to `DesktopShell`**

Inside `export function DesktopShell()`, find the shared state block:

```js
const [selectedProduct, setSelectedProduct] = useState(null);
const [pasteEan, setPasteEan] = useState('');
const [scanCount, setScanCount] = useState(0);
```

Replace with:

```js
const [selectedProduct, setSelectedProduct] = useState(null);
const [pasteEan, setPasteEan] = useState('');
const [scanCount, setScanCount] = useState(0);
const [selectedEans, setSelectedEans] = useState(new Set());
const [bulkDeleting, setBulkDeleting] = useState(false);
const [bulkDeleteError, setBulkDeleteError] = useState(null);
```

- [ ] **Step 6: Add `handleToggleSelect`, `handleSelectAll` and update `handleNav`**

Find `handleNav`:

```js
const handleNav = (nav) => {
  setActiveNav(nav);
  setSelectedProduct(null);
};
```

Replace with:

```js
const handleNav = (nav) => {
  setActiveNav(nav);
  setSelectedProduct(null);
  setSelectedEans(new Set());
  setBulkDeleteError(null);
};

const handleToggleSelect = (ean) => {
  setSelectedEans(prev => {
    const s = new Set(prev);
    s.has(ean) ? s.delete(ean) : s.add(ean);
    return s;
  });
};

const handleSelectAll = () => {
  if (selectedEans.size === displayItems.length && displayItems.length > 0) {
    setSelectedEans(new Set());
  } else {
    setSelectedEans(new Set(displayItems.map(p => p.ean)));
  }
};
```

- [ ] **Step 7: Pass checkbox props to `TableHeader` and `TableRow` call sites**

Find every `<TableHeader/>` (there are two — one for affiche, one for catalogue) and replace both with:

```jsx
<TableHeader
  allSelected={displayItems.length > 0 && selectedEans.size === displayItems.length}
  onSelectAll={handleSelectAll}
/>
```

Find every `<TableRow` call site. There are two blocks:

For the affiche block, replace:
```jsx
<TableRow
  key={p.ean} product={p}
  selected={selectedProduct?.ean === p.ean}
  onSelect={setSelectedProduct}
/>
```
with:
```jsx
<TableRow
  key={p.ean} product={p}
  selected={selectedProduct?.ean === p.ean}
  onSelect={setSelectedProduct}
  checked={selectedEans.has(p.ean)}
  onToggle={handleToggleSelect}
/>
```

For the catalogue block, replace:
```jsx
<TableRow
  key={p.ean} product={p}
  selected={selectedProduct?.ean === p.ean}
  onSelect={setSelectedProduct}
/>
```
with:
```jsx
<TableRow
  key={p.ean} product={p}
  selected={selectedProduct?.ean === p.ean}
  onSelect={setSelectedProduct}
  checked={selectedEans.has(p.ean)}
  onToggle={handleToggleSelect}
/>
```

- [ ] **Step 8: Verify manually**

Run `npm run dev`. Open the desktop view at ≥ 1024px. Navigate to Catalogue or Affiche. Expected:
- A checkbox column appears on the left of every row
- A "select all" checkbox appears in the table header
- Clicking a checkbox selects the row (lavender tint) without opening the detail panel
- Clicking the row itself (not the checkbox) opens the detail panel as before
- "Select all" checks/unchecks all visible rows

- [ ] **Step 9: Commit**

```bash
git add src/pages/DesktopShell.jsx
git commit -m "feat: checkbox column + selection state for bulk operations"
```

---

### Task 3: Bulk action bar + bulk delete

**Files:**
- Modify: `src/pages/DesktopShell.jsx`

- [ ] **Step 1: Add `handleBulkDelete` to `DesktopShell`**

After `handleSelectAll`, add:

```js
const handleBulkDelete = async () => {
  setBulkDeleting(true);
  setBulkDeleteError(null);
  const eans = [...selectedEans];
  const results = await Promise.allSettled(eans.map(ean => deleteProduct(ean)));
  const succeeded = eans.filter((_, i) => results[i].status === 'fulfilled');
  const failed = eans.filter((_, i) => results[i].status === 'rejected');
  if (succeeded.length > 0) {
    const successSet = new Set(succeeded);
    setProducts(prev => prev.filter(p => !successSet.has(p.ean)));
    setAfficheItems(prev => prev.filter(p => !successSet.has(p.ean)));
    if (selectedProduct && successSet.has(selectedProduct.ean)) setSelectedProduct(null);
    setSelectedEans(new Set(failed));
  }
  if (failed.length > 0) {
    setBulkDeleteError(`${failed.length} suppression(s) échouée(s)`);
  }
  setBulkDeleting(false);
};
```

- [ ] **Step 2: Add the bulk action bar to the JSX**

Find the `{/* ── Body: table + detail panel ── */}` comment. Just before it, add:

```jsx
{/* ── Bulk action bar ── */}
{selectedEans.size > 0 && (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 10,
    padding: '0 16px', height: 38, flexShrink: 0,
    background: 'var(--tint-peach)',
    borderBottom: '0.5px solid var(--hairline)',
  }}>
    <span style={{ fontSize: 13, color: 'var(--charcoal)', flex: 1 }}>
      {selectedEans.size} produit{selectedEans.size > 1 ? 's' : ''} sélectionné{selectedEans.size > 1 ? 's' : ''}
    </span>
    {bulkDeleteError && (
      <span style={{ fontSize: 12, color: 'var(--error)' }}>{bulkDeleteError}</span>
    )}
    <button
      onClick={handleBulkDelete}
      disabled={bulkDeleting}
      className="btn"
      style={{ height: 28, fontSize: 12, color: 'var(--error)', borderColor: 'rgba(160,46,109,0.25)' }}
    >
      {bulkDeleting ? 'Suppression…' : `Supprimer ${selectedEans.size}`}
    </button>
    <button
      onClick={() => { setSelectedEans(new Set()); setBulkDeleteError(null); }}
      className="btn btn-ghost"
      style={{ height: 28, width: 28, padding: 0, justifyContent: 'center' }}
    >
      <Icon.Close s={13}/>
    </button>
  </div>
)}
```

- [ ] **Step 3: Verify manually**

Run `npm run dev`. Select 2+ rows via checkboxes. Expected:
- A peach-tinted bar appears above the table showing the count
- "Supprimer N" button visible
- Clicking it deletes the products and removes them from the list
- Selection clears after successful delete
- [✕] clears selection without deleting
- If one delete fails, remaining failed EANs stay selected and an error message appears

- [ ] **Step 4: Commit**

```bash
git add src/pages/DesktopShell.jsx
git commit -m "feat: bulk action bar with bulk delete"
```

---

### Task 4: Single delete in `DetailPanel`

**Files:**
- Modify: `src/pages/DesktopShell.jsx`

- [ ] **Step 1: Add `handleDelete` to `DesktopShell`**

After `handleUpdate`, add:

```js
const handleDelete = async (ean) => {
  await deleteProduct(ean);
  setProducts(prev => prev.filter(p => p.ean !== ean));
  setAfficheItems(prev => prev.filter(p => p.ean !== ean));
  setSelectedEans(prev => { const s = new Set(prev); s.delete(ean); return s; });
  setSelectedProduct(null);
};
```

- [ ] **Step 2: Pass `onDelete` to `DetailPanel`**

Find the `<DetailPanel` call at the bottom of the JSX:

```jsx
<DetailPanel
  product={selectedProduct}
  onUpdate={handleUpdate}
  onClose={() => setSelectedProduct(null)}
/>
```

Replace with:

```jsx
<DetailPanel
  product={selectedProduct}
  onUpdate={handleUpdate}
  onDelete={handleDelete}
  onClose={() => setSelectedProduct(null)}
/>
```

- [ ] **Step 3: Add delete state to `DetailPanel`**

Find the start of `function DetailPanel({ product, onUpdate, onClose })` and update the signature and state block:

```jsx
function DetailPanel({ product, onUpdate, onDelete, onClose }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [modalSrc, setModalSrc] = useState(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteErr, setDeleteErr] = useState(null);
```

- [ ] **Step 4: Reset delete state when product changes**

Find the existing `useEffect` that resets on `product?.ean`:

```js
useEffect(() => {
  setEditing(false);
  setEditData(null);
  setSaveErr(null);
  setPickerPackshots([]);
}, [product?.ean]);
```

Replace with:

```js
useEffect(() => {
  setEditing(false);
  setEditData(null);
  setSaveErr(null);
  setPickerPackshots([]);
  setConfirmingDelete(false);
  setDeleteErr(null);
}, [product?.ean]);
```

- [ ] **Step 5: Add auto-reset timeout for confirm state**

After that `useEffect`, add:

```js
useEffect(() => {
  if (!confirmingDelete) return;
  const t = setTimeout(() => setConfirmingDelete(false), 3000);
  return () => clearTimeout(t);
}, [confirmingDelete]);
```

- [ ] **Step 6: Add `handleDelete` to `DetailPanel`**

After `handleCopyField`, add:

```js
const handleDelete = async () => {
  if (!confirmingDelete) { setConfirmingDelete(true); return; }
  setDeleting(true);
  setDeleteErr(null);
  try {
    await onDelete(product.ean);
  } catch (e) {
    setDeleteErr(e.message || 'Erreur lors de la suppression');
    setDeleting(false);
    setConfirmingDelete(false);
  }
};
```

- [ ] **Step 7: Add the delete button in the panel header**

Find the header section with the "Corriger" button:

```jsx
{!editing && (
  <button onClick={startEdit} className="btn btn-ghost" style={{ height: 28 }}>
    <Icon.Edit s={13}/> Corriger
  </button>
)}
```

Replace with:

```jsx
{!editing && (
  <>
    <button onClick={startEdit} className="btn btn-ghost" style={{ height: 28 }}>
      <Icon.Edit s={13}/> Corriger
    </button>
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="btn btn-ghost"
      style={{
        height: 28,
        color: confirmingDelete ? 'var(--error)' : 'var(--stone)',
        borderColor: confirmingDelete ? 'rgba(160,46,109,0.3)' : 'transparent',
      }}
    >
      {deleting ? '…' : confirmingDelete ? 'Confirmer ?' : 'Supprimer'}
    </button>
  </>
)}
```

- [ ] **Step 8: Display delete error**

In the view mode section (inside `{editing ? ... : ...}`), find the first line of the view mode block and add error display before it:

```jsx
) : (
  /* View mode */
  <div style={{ padding: '0 20px 24px' }}>
    {deleteErr && (
      <div style={{ fontSize: 12, color: 'var(--error)', padding: '8px 0' }}>{deleteErr}</div>
    )}
    <div style={{ paddingTop: 14, paddingBottom: 10 }}>
```

- [ ] **Step 9: Verify manually**

Run `npm run dev`. Click a product row to open the detail panel. Expected:
- "Supprimer" button appears in the header next to "Corriger"
- First click: button turns red and shows "Confirmer ?"
- Click elsewhere or wait 3s: resets to "Supprimer"
- Second click on "Confirmer ?": product deleted, removed from list, panel closes
- No double-delete possible during `deleting` state

- [ ] **Step 10: Commit**

```bash
git add src/pages/DesktopShell.jsx
git commit -m "feat: single delete button in detail panel"
```
