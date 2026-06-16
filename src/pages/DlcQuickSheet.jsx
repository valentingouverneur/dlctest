import React, { useMemo, useState } from 'react';
import { Packshot } from '../primitives';
import { Icon } from '../icons';
import { saveDlcItem } from '../lib/dlcItems';

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function addDaysIso(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DlcQuickSheet({ product, onClose, onSaved }) {
  const [expiryDate, setExpiryDate] = useState(todayIso());
  const [quantity, setQuantity] = useState(1);
  const [zone, setZone] = useState(product?.category || 'Surgelés');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const title = product?.title || product?.ean || 'Produit';
  const quickDates = useMemo(() => [
    ['Auj.', todayIso()],
    ['Demain', addDaysIso(1)],
    ['+2', addDaysIso(2)],
    ['+3', addDaysIso(3)],
  ], []);

  async function submit(e) {
    e.preventDefault();
    if (!product?.ean || !expiryDate || saving) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await saveDlcItem({
        ...product,
        expiryDate,
        quantity,
        zone: zone.trim(),
        note: note.trim(),
      });
      if (saved.syncError) {
        setError('Enregistré sur cet appareil seulement : table Supabase dlc_items indisponible.');
        return;
      }
      onSaved?.(saved);
    } catch (err) {
      setError(err.message || 'Erreur enregistrement DLC');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 200,
        background: 'rgba(0,0,0,0.58)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <form
        onSubmit={submit}
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 520,
          background: 'var(--canvas)', color: 'var(--ink)',
          borderRadius: '18px 18px 0 0',
          padding: '16px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.35)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <Packshot product={{ title, brand: product?.brand, cat: product?.category, imageUrl: product?.image_url }} size={48} radius={8} hint={false}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--warning)', marginBottom: 2 }}>
              Ajouter DLC
            </div>
            <div style={{ fontSize: 15, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{title}</div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>{product?.ean}</div>
          </div>
          <button type="button" onClick={onClose} style={{ width: 34, height: 34, border: 'none', borderRadius: 9, background: 'var(--surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon.Close s={16}/>
          </button>
        </div>

        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>
          Date DLC
        </label>
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {quickDates.map(([label, value]) => (
            <button
              key={label}
              type="button"
              onClick={() => setExpiryDate(value)}
              className={'chip' + (expiryDate === value ? ' is-active' : '')}
              style={{ flex: 1, justifyContent: 'center' }}
            >{label}</button>
          ))}
        </div>
        <input
          type="date"
          value={expiryDate}
          onChange={e => setExpiryDate(e.target.value)}
          required
          style={{
            width: '100%', height: 42, border: '1px solid var(--hairline-strong)', borderRadius: 10,
            padding: '0 12px', fontFamily: 'inherit', fontSize: 15, background: 'var(--canvas)', color: 'var(--ink)',
            marginBottom: 12,
          }}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '112px 1fr', gap: 10, marginBottom: 12 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Qté</label>
            <div style={{ display: 'flex', height: 42, border: '1px solid var(--hairline-strong)', borderRadius: 10, overflow: 'hidden' }}>
              <button type="button" onClick={() => setQuantity(q => Math.max(1, q - 1))} style={{ width: 34, border: 'none', background: 'var(--surface)', fontSize: 18 }}>−</button>
              <input value={quantity} onChange={e => setQuantity(Math.max(1, Number(e.target.value.replace(/\D/g, '')) || 1))} inputMode="numeric" style={{ width: 44, border: 'none', textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: 15, outline: 'none' }}/>
              <button type="button" onClick={() => setQuantity(q => q + 1)} style={{ width: 34, border: 'none', background: 'var(--surface)', fontSize: 18 }}>+</button>
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--ink-4)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6 }}>Zone</label>
            <input value={zone} onChange={e => setZone(e.target.value)} placeholder="Surgelés, bac 3…" style={{ width: '100%', height: 42, border: '1px solid var(--hairline-strong)', borderRadius: 10, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, outline: 'none' }}/>
          </div>
        </div>

        <input value={note} onChange={e => setNote(e.target.value)} placeholder="Note optionnelle" style={{ width: '100%', height: 40, border: '1px solid var(--hairline-strong)', borderRadius: 10, padding: '0 12px', fontFamily: 'inherit', fontSize: 14, outline: 'none', marginBottom: 14 }}/>

        {error && <div style={{ fontSize: 12, color: 'var(--warning)', marginBottom: 10 }}>{error}</div>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={onClose} disabled={saving} className="btn" style={{ flex: 1, height: 42 }}>Annuler</button>
          <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex: 2, height: 42 }}>
            {saving ? 'Enregistrement…' : 'Enregistrer DLC'}
          </button>
        </div>
      </form>
    </div>
  );
}
