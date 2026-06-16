import React, { useEffect, useState } from 'react';
import { Packshot, CopyField, SideItem, Pill, ImageModal } from '../primitives';
import { Icon } from '../icons';
import { searchProducts, getProductByEan, updateProduct, createProduct, deleteProduct } from '../lib/products';
import { fetchFromOFF } from '../lib/openFoodFacts';
import { getTodayCount, getHistory } from '../lib/scanHistory';
import { getRecentScans } from '../lib/scans';
import { searchPackshots } from '../lib/bingImages';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { deleteDlcItem, getDlcItems, getDlcItemsAsync, getDlcUrgency, getLastDlcSyncError, updateDlcItemDetails, updateDlcItemStatus } from '../lib/dlcItems';

const CATEGORIES = ['Glaces', 'Viande', 'Poisson', 'Légumes', 'Pizza', 'Plats cuisinés', 'Frites', 'Entrée'];
const GRID = '20px 56px 1.8fr 1fr 88px 148px 118px';

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

function catDisplayLabel(category) {
  if (category === 'Glaces') return 'Surgelés';
  return category;
}

function catTone(category) {
  if (category === 'Glaces') return 'accent';
  if (category === 'Viande' || category === 'Poisson') return 'ok';
  return 'neutral';
}

// ─── Sidebar ───────────────────────────────────────────────────────
function DesktopSidebar({ activeNav, onNav, scanCount }) {
  return (
    <div style={{
      width: 220, flexShrink: 0,
      borderRight: '0.5px solid var(--hairline)',
      background: 'var(--canvas)',
      display: 'flex', flexDirection: 'column',
      padding: '14px 12px',
      height: '100%',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 16px' }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: 'var(--charcoal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600,
        }}>D</div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>DLC</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--stone)' }}>v2</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <SideItem icon={<Icon.Image s={16}/>} label="Affiche" active={activeNav === 'affiche'} onClick={() => onNav('affiche')}/>
        <SideItem icon={<Icon.Catalog s={16}/>} label="Catalogue" active={activeNav === 'catalogue'} onClick={() => onNav('catalogue')}/>
        <SideItem icon={<Icon.Calendar s={16}/>} label="Calendrier DLC" active={activeNav === 'dlc'} onClick={() => onNav('dlc')}/>
        <SideItem icon={<Icon.Settings s={16}/>} label="Paramètres" active={activeNav === 'settings'} onClick={() => onNav('settings')}/>
      </div>

      <div style={{ flex: 1 }}/>

      <div style={{ padding: '10px', borderTop: '0.5px solid var(--hairline)', marginTop: 12 }}>
        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 6 }}>
          Session
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
            {scanCount}
          </div>
          <div style={{ fontSize: 11, color: 'var(--stone)' }}>scans aujourd'hui</div>
        </div>
      </div>
    </div>
  );
}

// ─── Table header ──────────────────────────────────────────────────
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

// ─── Table row ─────────────────────────────────────────────────────
function CopyBtn({ value, field, copiedField, onCopy }) {
  const done = copiedField === field;
  return (
    <button
      onClick={e => { e.stopPropagation(); onCopy(field, value); }}
      title={`Copier ${field}`}
      style={{
        flexShrink: 0, width: 26, height: 26, borderRadius: 5, border: 'none',
        background: done ? 'var(--tint-mint)' : 'transparent',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: done ? 'var(--success)' : 'var(--steel)',
        opacity: done ? 1 : 0.5,
        transition: 'background 0.12s, color 0.12s, opacity 0.12s',
      }}
      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; if (!done) e.currentTarget.style.background = 'var(--surface)'; }}
      onMouseLeave={e => { if (!done) { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.background = 'transparent'; } }}
    >
      {done ? <Icon.Check s={15} c="var(--success)"/> : <Icon.Copy s={15}/>}
    </button>
  );
}

function TableRow({ product, selected, onSelect, checked, onToggle }) {
  const [modalSrc, setModalSrc] = useState(null);
  const [copiedField, setCopiedField] = useState(null);

  const handleCopyField = (field, value) => {
    if (!value) return;
    navigator.clipboard?.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1200);
  };

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
          onChange={e => { e.stopPropagation(); onToggle(product.ean); }}
          style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: 14, height: 14 }}
        />
        <div onClick={openImage} style={{ cursor: hasImage ? 'zoom-in' : 'default' }}>
          <Packshot
            product={{ title: product.title, brand: product.brand, cat: catDisplayLabel(product.category), imageUrl: product.image_url || product.packshots?.[0] }}
            size={40} radius={4} hint={false}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--charcoal)', fontWeight: 450 }}>{product.title}</span>
          <CopyBtn value={product.title} field="title" copiedField={copiedField} onCopy={handleCopyField}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--slate)' }}>{product.brand}</span>
          <CopyBtn value={product.brand} field="brand" copiedField={copiedField} onCopy={handleCopyField}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--slate)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{product.weight}</span>
          <CopyBtn value={product.weight} field="weight" copiedField={copiedField} onCopy={handleCopyField}/>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ color: 'var(--steel)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>{product.ean}</span>
          <CopyBtn value={product.ean} field="ean" copiedField={copiedField} onCopy={handleCopyField}/>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Pill tone={catTone(product.category)}>{product.category || '—'}</Pill>
        </div>
      </div>
    </>
  );
}

// ─── Affiche card (desktop) ────────────────────────────────────────
function AfficheDesktopCard({ product, selected, onSelect }) {
  const [copied, setCopied] = useState(false);

  function copyEan(e) {
    e.stopPropagation();
    navigator.clipboard?.writeText(product.ean);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  }

  return (
    <div
      style={{
        borderRadius: 10, overflow: 'hidden',
        border: selected ? '2px solid var(--primary)' : '0.5px solid var(--hairline)',
        background: 'var(--canvas)', userSelect: 'none',
        transition: 'box-shadow 0.1s, border-color 0.1s',
        boxShadow: selected ? '0 0 0 3px var(--tint-lavender)' : 'none',
      }}
      onMouseEnter={e => { if (!selected) e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'; }}
      onMouseLeave={e => { if (!selected) e.currentTarget.style.boxShadow = 'none'; }}
    >
      <button
        onClick={() => onSelect(product)}
        style={{ display: 'block', width: '100%', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
      >
        <div style={{ aspectRatio: '1', overflow: 'hidden', background: 'var(--surface)' }}>
          {product.image_url ? (
            <img
              src={product.image_url} alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onError={e => { e.currentTarget.style.opacity = '0'; }}
            />
          ) : (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon.Image s={28} c="var(--stone)"/>
            </div>
          )}
        </div>
        <div style={{ padding: '8px 10px 4px' }}>
          <div style={{
            fontSize: 12, fontWeight: 500, color: 'var(--charcoal)',
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
            overflow: 'hidden', lineHeight: 1.35, minHeight: '2.7em',
          }}>{product.title || product.ean}</div>
          {product.brand && (
            <div style={{ fontSize: 11, color: 'var(--slate)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.brand}</div>
          )}
        </div>
      </button>
      <button
        onClick={copyEan}
        style={{
          width: '100%', padding: '3px 10px 9px',
          display: 'flex', alignItems: 'center', gap: 4,
          border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--slate)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {product.ean}
        </span>
        {copied
          ? <Icon.Check s={10} c="var(--primary)"/>
          : <Icon.Copy s={10} c="var(--stone)"/>}
      </button>
    </div>
  );
}

// ─── Edit field ────────────────────────────────────────────────────
function EditField({ label, value, onChange, mono = false, readOnly = false }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 4 }}>
        {label}
      </div>
      <input
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        readOnly={readOnly}
        className="input"
        style={{ fontFamily: mono ? 'var(--font-mono)' : 'inherit', opacity: readOnly ? 0.55 : 1 }}
      />
    </div>
  );
}

// ─── Detail panel ──────────────────────────────────────────────────
function DetailPanel({ product, onUpdate, onClose }) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [modalSrc, setModalSrc] = useState(null);

  // Packshot picker
  const [pickerPackshots, setPickerPackshots] = useState([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  useEffect(() => {
    setEditing(false);
    setEditData(null);
    setSaveErr(null);
    setPickerPackshots([]);
  }, [product?.ean]);

  const startEdit = () => {
    setEditData({ title: product.title, brand: product.brand, weight: product.weight, category: product.category });
    setEditing(true);
    setSaveErr(null);
  };

  const cancelEdit = () => { setEditing(false); setEditData(null); setSaveErr(null); };

  const saveEdit = async () => {
    setSaving(true);
    setSaveErr(null);
    try {
      const updated = await updateProduct(product.ean, editData);
      onUpdate(updated);
      setEditing(false);
      setEditData(null);
    } catch (e) {
      setSaveErr(e.message || 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyAll = async () => {
    const parts = [product.title, product.brand, product.weight, product.ean].filter(Boolean);
    await copyToClipboard(parts.join('\t'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1600);
  };

  const handleCopyField = async (_, value) => { if (value) await copyToClipboard(value); };

  const handleOpenPicker = async () => {
    setPickerLoading(true);
    setPickerPackshots([]);
    const packshots = await searchPackshots(product.title, product.brand, 3, product.ean).catch(() => []);
    setPickerPackshots(packshots);
    setPickerLoading(false);
  };

  const handlePickPackshot = async (url) => {
    try {
      let updated;
      if (product.source === 'openfoodfacts') {
        updated = await createProduct({ ...product, image_url: url });
      } else {
        updated = await updateProduct(product.ean, { image_url: url });
      }
      onUpdate(updated);
      setPickerPackshots([]);
    } catch {}
  };

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
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          border: '0.5px dashed var(--hairline-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
        }}>
          <Icon.Catalog s={18} c="var(--stone)"/>
        </div>
        Sélectionne un produit<br/>pour voir sa fiche
      </div>
    );
  }

  // Not found state
  if (product.notFound) {
    return (
      <div style={{
        width: 380, flexShrink: 0,
        borderLeft: '0.5px solid var(--hairline)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, background: 'var(--canvas)', textAlign: 'center',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 8, right: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone)' }}>
          <Icon.Close s={14}/>
        </button>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: 'var(--tint-rose)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <Icon.Warn s={20} c="var(--error)"/>
        </div>
        <div style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4, fontSize: 14 }}>EAN introuvable</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--steel)' }}>{product.ean}</div>
      </div>
    );
  }

  return (
    <div style={{
      width: 380, flexShrink: 0,
      borderLeft: '0.5px solid var(--hairline)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)', overflow: 'hidden',
    }}>
      {modalSrc && <ImageModal src={modalSrc} onClose={() => setModalSrc(null)}/>}
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '0 8px 0 16px',
        borderBottom: '0.5px solid var(--hairline)',
        height: 44, flexShrink: 0,
      }}>
        <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)', flex: 1 }}>
          Fiche produit
        </div>
        {!editing && (
          <button onClick={startEdit} className="btn btn-ghost" style={{ height: 28 }}>
            <Icon.Edit s={13}/> Corriger
          </button>
        )}
        <button onClick={onClose} className="btn btn-ghost" style={{ height: 28, width: 28, padding: 0, justifyContent: 'center' }}>
          <Icon.Close s={14}/>
        </button>
      </div>

      {/* Scrollable body */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* Packshot */}
        <div style={{
          padding: '20px 24px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
          background: 'var(--canvas)', borderBottom: '0.5px solid var(--hairline)',
        }}>
          <div
            onClick={() => (product.image_url || product.packshots?.[0]) && setModalSrc(product.image_url || product.packshots?.[0])}
            style={{ cursor: (product.image_url || product.packshots?.[0]) ? 'zoom-in' : 'default' }}
          >
            <Packshot
              product={{ title: product.title, brand: product.brand, cat: catDisplayLabel(product.category), imageUrl: product.image_url || product.packshots?.[0] }}
              size={120} radius={12}
            />
          </div>
          <button
            onClick={handleOpenPicker}
            disabled={pickerLoading}
            className="btn btn-ghost"
            style={{ height: 26, fontSize: 12 }}
          >
            <Icon.Image s={12}/> {pickerLoading ? '…' : 'Changer l\'image'}
          </button>

          {/* Inline packshot picker */}
          {pickerPackshots.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, width: '100%' }}>
              {pickerPackshots.map((url, i) => (
                <button
                  key={i}
                  onClick={() => handlePickPackshot(url)}
                  style={{
                    border: url === product.image_url ? '2.5px solid var(--primary)' : '1.5px solid var(--hairline-strong)',
                    borderRadius: 8, overflow: 'hidden', padding: 0, cursor: 'pointer',
                    aspectRatio: '1', background: '#fff',
                  }}
                >
                  <img
                    src={url} alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                    onError={e => { e.currentTarget.style.opacity = '0.3'; }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title + category */}
        <div style={{ padding: '14px 20px 8px' }}>
          <Pill tone={catTone(product.category)}>{product.category || '—'}</Pill>
          <div style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.25, color: 'var(--ink)', marginTop: 8, letterSpacing: '-0.01em' }}>
            {product.title}
          </div>
        </div>

        {editing ? (
          /* Edit mode */
          <div style={{ padding: '8px 20px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <EditField label="Titre" value={editData.title} onChange={v => setEditData(d => ({ ...d, title: v }))}/>
            <EditField label="Marque" value={editData.brand} onChange={v => setEditData(d => ({ ...d, brand: v }))}/>
            <EditField label="Poids" value={editData.weight} mono onChange={v => setEditData(d => ({ ...d, weight: v }))}/>
            <EditField label="EAN" value={product.ean} readOnly mono onChange={() => {}}/>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 6 }}>
                Catégorie
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {CATEGORIES.map(c => (
                  <button key={c}
                    onClick={() => setEditData(d => ({ ...d, category: c }))}
                    className={'chip' + (editData.category === c ? ' is-active' : '')}
                    style={{ height: 26, fontSize: 12 }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            {saveErr && <div style={{ fontSize: 12, color: 'var(--error)' }}>{saveErr}</div>}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button onClick={cancelEdit} className="btn" style={{ flex: 1, height: 36, justifyContent: 'center' }}>
                Annuler
              </button>
              <button onClick={saveEdit} disabled={saving} className="btn btn-primary" style={{ flex: 1, height: 36, justifyContent: 'center' }}>
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div style={{ padding: '0 20px 24px' }}>
            <div style={{ paddingTop: 14, paddingBottom: 10 }}>
              <button
                onClick={handleCopyAll}
                className="focus-ring"
                style={{
                  width: '100%', height: 36,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  background: copiedAll ? 'var(--charcoal)' : 'var(--primary)',
                  color: 'white', border: 'none', borderRadius: 8,
                  fontFamily: 'inherit', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                  transition: 'background-color .15s',
                }}>
                {copiedAll
                  ? <><Icon.Check s={14} c="white"/> Copié</>
                  : <><Icon.Copy s={14} c="white"/> Copier tout (Factory)</>}
              </button>
              <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 5, textAlign: 'center' }}>
                Titre · Marque · Poids · EAN — séparés par tabulation
              </div>
            </div>
            <CopyField label="Titre" value={product.title} large onCopy={handleCopyField}/>
            <CopyField label="Marque" value={product.brand} onCopy={handleCopyField}/>
            <CopyField label="Poids" value={product.weight} onCopy={handleCopyField}/>
            <CopyField label="EAN" value={product.ean} mono onCopy={handleCopyField}/>
          </div>
        )}
      </div>
    </div>
  );
}

function DlcDesktopView() {
  const [items, setItems] = useState(() => getDlcItems());
  const [loading, setLoading] = useState(false);
  const [syncError, setSyncError] = useState(null);

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

  useEffect(() => { refresh(); }, []);

  const setStatus = async (id, status) => {
    await updateDlcItemStatus(id, status);
    refresh();
  };
  const remove = async (id) => {
    await deleteDlcItem(id);
    refresh();
  };

  const urgencyMeta = (item) => {
    const u = getDlcUrgency(item);
    if (u === 'today') return { label: 'Aujourd’hui', bg: 'var(--tint-peach)', color: 'var(--warning)' };
    if (u === 'tomorrow') return { label: 'Demain', bg: 'oklch(0.96 0.05 80)', color: 'oklch(0.55 0.12 70)' };
    if (u === 'soon') return { label: 'Bientôt', bg: 'var(--tint-lavender)', color: 'var(--primary)' };
    return { label: 'Plus tard', bg: 'var(--surface)', color: 'var(--steel)' };
  };

  if (items.length === 0) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: 'var(--steel)', fontSize: 13 }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)', marginBottom: 6 }}>{loading ? 'Chargement des DLC…' : 'Aucune DLC enregistrée'}</div>
        {!loading && <>
          {syncError && (
            <div style={{ margin: '0 auto 12px', maxWidth: 520, padding: '10px 12px', borderRadius: 10, background: 'var(--tint-peach)', color: 'var(--warning)' }}>
              Synchro Supabase indisponible : lance le schema SQL pour créer <span className="mono">dlc_items</span>.
            </div>
          )}
          <div>Dans le scanner, scanne un produit puis touche le petit bouton “DLC” si besoin.</div>
          <div style={{ marginTop: 6, color: 'var(--stone)' }}>Le scan normal reste inchangé. Les lignes sont synchronisées via Supabase.</div>
        </>}
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 650, color: 'var(--ink)' }}>DLC enregistrées</div>
          <div style={{ fontSize: 12, color: syncError ? 'var(--warning)' : 'var(--steel)', marginTop: 2 }}>{syncError ? 'Mode local : synchro Supabase indisponible' : `${items.length} ligne${items.length > 1 ? 's' : ''} synchronisée${items.length > 1 ? 's' : ''} Supabase`}</div>
        </div>
        <button className="btn" onClick={refresh} disabled={loading}>{loading ? 'Synchro…' : 'Rafraîchir'}</button>
      </div>

      <div style={{ border: '0.5px solid var(--hairline)', borderRadius: 12, overflow: 'hidden', background: 'var(--canvas)' }}>
        {items.map(item => {
          const meta = urgencyMeta(item);
          const done = item.status !== 'a_traiter';
          return (
            <div key={item.id} style={{
              display: 'grid', gridTemplateColumns: '44px 1.6fr 110px 70px 120px 180px', gap: 12,
              alignItems: 'center', padding: '10px 12px', borderBottom: '0.5px solid var(--hairline)',
              opacity: done ? 0.62 : 1,
            }}>
              <Packshot product={{ title: item.title, brand: item.brand, cat: item.category, imageUrl: item.image_url }} size={38} radius={8} hint={false}/>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 550, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                <div className="mono" style={{ fontSize: 11, color: 'var(--stone)', marginTop: 2 }}>{[item.brand, item.weight, item.ean].filter(Boolean).join(' · ')}</div>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--slate)' }}>{item.expiryDate}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--slate)' }}>{item.quantity} u.</div>
              <div style={{ fontSize: 12, color: 'var(--slate)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.zone || '—'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <span style={{ padding: '4px 8px', borderRadius: 99, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 650 }}>{done ? item.status : meta.label}</span>
                <button className="btn" onClick={() => setStatus(item.id, done ? 'a_traiter' : 'fait')} style={{ height: 28, fontSize: 12 }}>{done ? 'Rouvrir' : 'Fait'}</button>
                <button className="btn btn-ghost" onClick={() => remove(item.id)} style={{ height: 28, width: 28, padding: 0, justifyContent: 'center' }}><Icon.Close s={12}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main desktop shell ────────────────────────────────────────────
export function DesktopShell() {
  const [activeNav, setActiveNav] = useState('affiche');

  // Catalogue state
  const [products, setProducts] = useState([]);
  const [catalogueLoading, setCatalogueLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const [needsReview, setNeedsReview] = useState(false);

  // Affiche state
  const [afficheItems, setAfficheItems] = useState([]);
  const [afficheLoading, setAfficheLoading] = useState(false);

  // Shared
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [pasteEan, setPasteEan] = useState('');
  const [scanCount, setScanCount] = useState(0);
  const [selectedEans, setSelectedEans] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState(null);

  useEffect(() => { setScanCount(getTodayCount()); }, []);

  // Load catalogue products
  useEffect(() => {
    if (activeNav !== 'catalogue') return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setCatalogueLoading(true);
      setErr(null);
      try {
        const data = await searchProducts({ query: q.trim(), category: cat, needsReview, limit: 300 });
        if (!cancelled) setProducts(data);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Erreur');
      } finally {
        if (!cancelled) setCatalogueLoading(false);
      }
    }, q ? 200 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, cat, needsReview, activeNav]);

  // Load affiche items from Supabase scans table (fallback: localStorage)
  useEffect(() => {
    if (activeNav !== 'affiche') return;
    let cancelled = false;
    setAfficheLoading(true);

    async function loadAffiche() {
      // Get scan list
      let eans;
      const supaScans = await getRecentScans(20);
      if (supaScans !== null && supaScans.length > 0) {
        eans = supaScans.map(s => s.ean);
      } else {
        const seen = new Set();
        const localMap = getHistory().filter(h => {
          if (seen.has(h.ean)) return false;
          seen.add(h.ean);
          return true;
        });
        eans = localMap.map(h => h.ean);
      }

      const localMap = Object.fromEntries(getHistory().map(h => [h.ean, h]));

      // Show placeholder rows immediately
      if (!cancelled) {
        setAfficheItems(eans.map(ean => ({
          ean,
          title: localMap[ean]?.title || ean,
          brand: localMap[ean]?.brand || null,
          weight: null,
          image_url: localMap[ean]?.image_url || null,
          category: localMap[ean]?.category || null,
          packshots: [],
        })));
        setAfficheLoading(false);
      }

      // Enrich with Supabase then OFF fallback
      const products = await Promise.all(eans.map(async ean => {
        const p = await getProductByEan(ean).catch(() => null);
        if (p) return { ...p, packshots: [] };
        // Not in catalogue — try OFF for metadata
        const offP = await fetchFromOFF(ean).catch(() => null);
        if (offP) return { ...offP, packshots: [] };
        // Last resort: localStorage cache
        return localMap[ean] ? {
          ean,
          title: localMap[ean].title || ean,
          brand: localMap[ean].brand || null,
          weight: null,
          image_url: null,
          category: localMap[ean].category || null,
          packshots: [],
        } : { ean, title: ean, brand: null, weight: null, image_url: null, category: null, packshots: [] };
      }));
      if (cancelled) return;
      setAfficheItems(products);
      if (products.length > 0) {
        setSelectedProduct(prev => prev === null ? products[0] : prev);
      }

      // Fetch Bing packshots for items without images (fire-and-forget)
      products.forEach(async (p) => {
        if (p.image_url || !p.title || p.title === p.ean) return;
        const packshots = await searchPackshots(p.title, p.brand, 3, p.ean).catch(() => []);
        if (cancelled || packshots.length === 0) return;
        setAfficheItems(prev => prev.map(it => it.ean === p.ean ? { ...it, packshots } : it));
        setSelectedProduct(sel => sel?.ean === p.ean ? { ...sel, packshots } : sel);
      });
    }

    loadAffiche();
    return () => { cancelled = true; };
  }, [activeNav]);

  // Realtime: prepend new scans as they arrive
  useEffect(() => {
    if (activeNav !== 'affiche') return;
    if (!isSupabaseConfigured || !supabase) return;

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
            searchPackshots(p.title, p.brand, 3, ean)
              .then(shots => {
                if (shots.length) {
                  setAfficheItems(prev =>
                    prev.map(it => it.ean === ean ? { ...it, packshots: shots } : it)
                  );
                  setSelectedProduct(sel => sel?.ean === ean ? { ...sel, packshots: shots } : sel);
                }
              })
              .catch(() => {});
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeNav]);

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
    const items = activeNav === 'affiche' ? afficheItems : products;
    if (selectedEans.size === items.length && items.length > 0) {
      setSelectedEans(new Set());
    } else {
      setSelectedEans(new Set(items.map(p => p.ean)));
    }
  };

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

  const submitPaste = async (e) => {
    e.preventDefault();
    if (pasteEan.length < 8) return;
    const ean = pasteEan;
    setPasteEan('');
    const list = activeNav === 'affiche' ? afficheItems : products;
    const found = list.find(p => p.ean === ean);
    if (found) { setSelectedProduct(found); return; }
    try {
      const product = await getProductByEan(ean);
      setSelectedProduct(product ?? { ean, notFound: true });
    } catch {
      setSelectedProduct({ ean, notFound: true });
    }
  };

  const handleUpdate = (updated) => {
    setProducts(prev => prev.map(p => p.ean === updated.ean ? updated : p));
    setAfficheItems(prev => prev.map(p => p.ean === updated.ean ? updated : p));
    setSelectedProduct(updated);
  };

  const setFilter = (category) => { setCat(category); setNeedsReview(false); };
  const toggleReview = () => { setNeedsReview(r => !r); setCat(null); };
  const fixCount = products.filter(p => !p.image_url).length;

  const displayItems = activeNav === 'affiche' ? afficheItems : activeNav === 'dlc' ? getDlcItems() : products;
  const displayLoading = activeNav === 'affiche' ? afficheLoading : activeNav === 'catalogue' ? catalogueLoading : false;
  const navTitle = activeNav === 'affiche' ? 'Affiche' : activeNav === 'dlc' ? 'Calendrier DLC' : activeNav === 'settings' ? 'Paramètres' : 'Catalogue';

  return (
    <div className="dlc-root" style={{ height: '100vh', display: 'flex', overflow: 'hidden' }}>
      <DesktopSidebar activeNav={activeNav} onNav={handleNav} scanCount={scanCount}/>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* ── Toolbar ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '0 16px', height: 48,
          borderBottom: '0.5px solid var(--hairline)',
          background: 'var(--canvas)', flexShrink: 0,
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)' }}>
            {navTitle}
          </div>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)', padding: '2px 7px', background: 'var(--surface)', borderRadius: 4 }}>
            {displayLoading ? '…' : displayItems.length}
          </span>

          {/* EAN paste */}
          <form onSubmit={submitPaste} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            height: 30, padding: '0 4px 0 10px',
            background: 'var(--surface)', border: '0.5px solid var(--hairline-strong)',
            borderRadius: 6, marginLeft: 6,
          }}>
            <Icon.Scan s={13} c="var(--stone)"/>
            <input
              value={pasteEan}
              onChange={e => setPasteEan(e.target.value.replace(/\D/g, ''))}
              placeholder="Coller EAN"
              maxLength={13}
              style={{
                width: 120, border: 'none', background: 'transparent', outline: 'none',
                fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.02em', color: 'var(--charcoal)',
              }}
            />
            <button type="submit" disabled={pasteEan.length < 8} style={{
              height: 22, padding: '0 8px', borderRadius: 4, border: 'none',
              background: pasteEan.length >= 8 ? 'var(--charcoal)' : 'var(--tint-gray)',
              color: pasteEan.length >= 8 ? 'white' : 'var(--stone)',
              fontSize: 11, fontWeight: 500,
              cursor: pasteEan.length >= 8 ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}>↵</button>
          </form>

          <div style={{ flex: 1 }}/>

          {/* Search — catalogue only */}
          {activeNav === 'catalogue' && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              height: 30, padding: '0 10px',
              background: 'var(--surface)', border: '0.5px solid var(--hairline-strong)',
              borderRadius: 6, width: 260,
            }}>
              <Icon.Search s={14} c="var(--stone)"/>
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Recherche…"
                style={{
                  flex: 1, border: 'none', background: 'transparent', outline: 'none',
                  fontFamily: 'inherit', fontSize: 12.5, color: 'var(--charcoal)',
                }}
              />
              {q && (
                <button onClick={() => setQ('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--stone)', padding: 0, display: 'flex' }}>
                  <Icon.Close s={12}/>
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Category chips — catalogue only ── */}
        {activeNav === 'catalogue' && (
          <div className="no-sb" style={{
            display: 'flex', gap: 6, padding: '8px 16px',
            borderBottom: '0.5px solid var(--hairline)',
            background: 'var(--canvas)', flexShrink: 0, overflowX: 'auto',
            alignItems: 'center',
          }}>
            <button className={'chip' + (cat === null && !needsReview ? ' is-active' : '')} onClick={() => setFilter(null)}>Tous</button>
            {CATEGORIES.map(c => (
              <button key={c} className={'chip' + (cat === c && !needsReview ? ' is-active' : '')} onClick={() => setFilter(cat === c ? null : c)}>
                {c}
              </button>
            ))}
            {fixCount > 0 && (
              <button onClick={toggleReview}
                className={'chip' + (needsReview ? ' is-active' : '')}
                style={needsReview ? {} : { color: 'var(--warning)', borderColor: 'oklch(0.84 0.08 70)' }}>
                <Icon.Warn s={11} c={needsReview ? 'white' : 'var(--warning)'}/>
                À corriger
                <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.7, marginLeft: 2 }}>{fixCount}</span>
              </button>
            )}
            <div style={{ flex: 1 }}/>
            <span style={{ fontSize: 11, color: 'var(--steel)', fontFamily: 'var(--font-mono)', whiteSpace: 'nowrap' }}>
              {displayLoading ? '…' : `${products.length} résultats`}
            </span>
          </div>
        )}

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

        {/* ── Body: table + detail panel ── */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden', minHeight: 0 }}>

          {/* Content area */}
          <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface)', minWidth: 0 }}>
            {err ? (
              <div style={{ padding: 24, color: 'var(--error)', fontSize: 13 }}>{err}</div>
            ) : activeNav === 'dlc' ? (
              <DlcDesktopView/>
            ) : activeNav === 'settings' ? (
              <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--steel)', fontSize: 13 }}>
                Paramètres à venir.
              </div>
            ) : activeNav === 'affiche' ? (
              <>
                <TableHeader
                  allSelected={afficheItems.length > 0 && selectedEans.size === afficheItems.length}
                  onSelectAll={handleSelectAll}
                />
                {afficheItems.map(p => (
                  <TableRow
                    key={p.ean} product={p}
                    selected={selectedProduct?.ean === p.ean}
                    onSelect={setSelectedProduct}
                    checked={selectedEans.has(p.ean)}
                    onToggle={handleToggleSelect}
                  />
                ))}
                {afficheItems.length === 0 && !afficheLoading && (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--steel)', fontSize: 13 }}>
                    Aucun scan enregistré. Scannez des produits depuis l'app mobile.
                  </div>
                )}
                <div style={{ height: 32 }}/>
              </>
            ) : (
              <>
                <TableHeader
                  allSelected={products.length > 0 && selectedEans.size === products.length}
                  onSelectAll={handleSelectAll}
                />
                {products.map(p => (
                  <TableRow
                    key={p.ean} product={p}
                    selected={selectedProduct?.ean === p.ean}
                    onSelect={setSelectedProduct}
                    checked={selectedEans.has(p.ean)}
                    onToggle={handleToggleSelect}
                  />
                ))}
                {!catalogueLoading && products.length === 0 && (
                  <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--steel)', fontSize: 13 }}>
                    {needsReview ? 'Aucun produit à corriger 🎉' : 'Aucun produit trouvé'}
                  </div>
                )}
                <div style={{ height: 32 }}/>
              </>
            )}
          </div>

          {/* Detail panel */}
          <DetailPanel
            product={selectedProduct}
            onUpdate={handleUpdate}
            onClose={() => setSelectedProduct(null)}
          />
        </div>
      </div>
    </div>
  );
}
