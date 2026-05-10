import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { getProductByEan } from '../lib/products';
import { addScan } from '../lib/scanHistory';
import { Packshot, CopyField } from '../primitives';
import { Icon } from '../icons';

function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

export function Product() {
  const { ean } = useParams();
  const [searchParams] = useSearchParams();
  const fromScan = searchParams.get('from') === 'scan';
  const nav = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);
  const [copiedAll, setCopiedAll] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErr(null);
    getProductByEan(ean)
      .then(p => {
        if (!cancelled) {
          setProduct(p);
          if (p && fromScan) addScan(p);
        }
      })
      .catch(e => { if (!cancelled) setErr(e.message || 'Erreur'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [ean]);

  const handleCopyField = async (label, value) => {
    if (value) await copyToClipboard(value);
  };

  const handleCopyAll = async () => {
    if (!product) return;
    const parts = [product.title, product.brand, product.weight, product.ean].filter(Boolean);
    await copyToClipboard(parts.join('\t'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 1600);
  };

  if (loading) {
    return (
      <div className="app-shell">
        <Header onBack={() => nav(-1)}/>
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)' }}>
          Chargement…
        </div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="app-shell">
        <Header onBack={() => nav(-1)}/>
        <div style={{ padding: 24, color: 'var(--err)' }}>{err}</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="app-shell">
        <Header onBack={() => nav(-1)}/>
        <div style={{ padding: '48px 24px', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 99,
            background: 'var(--tint-rose)', color: 'var(--err)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
          }}>
            <Icon.Warn s={28} c="var(--err)"/>
          </div>
          <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            EAN introuvable
          </div>
          <div className="mono" style={{
            fontSize: 13, color: 'var(--ink-4)', marginTop: 6,
            letterSpacing: '0.04em',
          }}>{ean}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 16, lineHeight: 1.5 }}>
            Ce code-barres ne correspond à aucun produit du catalogue.
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 24 }}>
            <button onClick={() => nav('/scan')} className="btn">Re-scanner</button>
            <button onClick={() => nav('/')} className="btn btn-primary">Retour catalogue</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Header onBack={() => nav(-1)} onScan={() => nav('/scan')}/>

      <div style={{ padding: '20px 16px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
        <Packshot product={{
          title: product.title, brand: product.brand,
          cat: product.category === 'Glaces' ? 'Surgelés' : 'Frais',
          imageUrl: product.image_url,
        }} size={88} radius={10} hint={false}/>
        <div style={{ flex: 1, minWidth: 0, paddingTop: 4 }}>
          <div style={{
            fontSize: 18, fontWeight: 600, color: 'var(--ink)', lineHeight: 1.3,
          }}>{product.title}</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', marginTop: 4 }}>
            {product.brand}
          </div>
          {product.category && (
            <div style={{ marginTop: 8 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center',
                height: 22, padding: '0 8px', borderRadius: 6,
                background: 'var(--tint-sky)', color: 'var(--ink-2)',
                fontSize: 12, fontWeight: 600,
              }}>{product.category}</span>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '0 16px' }}>
        <button
          onClick={handleCopyAll}
          className="focus-ring"
          style={{
            width: '100%', height: 44,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: copiedAll ? 'var(--ink)' : 'var(--primary)',
            color: 'white', border: 'none', borderRadius: 8,
            fontFamily: 'inherit', fontSize: 14, fontWeight: 500, cursor: 'pointer',
            transition: 'background-color .15s',
          }}>
          {copiedAll ? <><Icon.Check s={16} c="white"/> Copié</> : <><Icon.Copy s={16} c="white"/> Copier tout (Factory)</>}
        </button>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 6, textAlign: 'center' }}>
          Titre · Marque · Poids · EAN — séparés par tabulation
        </div>
      </div>

      <div style={{ padding: '20px 16px 32px' }}>
        <CopyField label="Titre" value={product.title} large onCopy={handleCopyField}/>
        <CopyField label="Marque" value={product.brand} onCopy={handleCopyField}/>
        <CopyField label="Poids" value={product.weight} onCopy={handleCopyField}/>
        <CopyField label="EAN" value={product.ean} mono onCopy={handleCopyField}/>
      </div>
    </div>
  );
}

function Header({ onBack, onScan }) {
  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 10,
      background: 'var(--canvas)',
      borderBottom: '0.5px solid var(--line)',
      padding: '10px 8px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <button
        onClick={onBack}
        aria-label="Retour"
        className="focus-ring"
        style={{
          width: 40, height: 40, borderRadius: 8,
          border: 'none', background: 'transparent', cursor: 'pointer',
          color: 'var(--ink-2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
        <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
          <Icon.ChevronRight s={18} c="var(--ink-2)"/>
        </span>
      </button>
      <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink-2)' }}>Fiche produit</div>
      {onScan ? (
        <button
          onClick={onScan}
          aria-label="Scanner"
          className="focus-ring"
          style={{
            width: 40, height: 40, borderRadius: 8,
            border: 'none', background: 'transparent', cursor: 'pointer',
            color: 'var(--ink-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
          <Icon.Scan s={18} c="var(--ink-2)"/>
        </button>
      ) : <div style={{ width: 40 }}/>}
    </header>
  );
}
