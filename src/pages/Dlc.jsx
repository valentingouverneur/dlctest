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
