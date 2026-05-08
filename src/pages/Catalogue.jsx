import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { searchProducts } from '../lib/products';
import { Packshot } from '../primitives';
import { Icon } from '../icons';

const CATEGORIES = ['Glaces', 'Viande', 'Poisson', 'Légumes', 'Pizza', 'Plats cuisinés', 'Frites', 'Entrée'];

function ProductRow({ product, onClick }) {
  return (
    <button onClick={onClick} className="focus-ring" style={{
      display: 'flex', gap: 12, alignItems: 'center',
      width: '100%', textAlign: 'left',
      padding: '10px 16px',
      border: 'none', background: 'transparent', cursor: 'pointer',
      borderBottom: '0.5px solid var(--line)',
      fontFamily: 'inherit',
    }}>
      <Packshot product={{
        title: product.title, brand: product.brand,
        cat: product.category === 'Glaces' ? 'Surgelés' : 'Frais',
        imageUrl: product.image_url,
      }} size={44} radius={6} hint={false}/>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 14, fontWeight: 500, color: 'var(--ink)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          lineHeight: 1.3,
        }}>{product.title}</div>
        <div style={{
          fontSize: 12, color: 'var(--ink-4)',
          marginTop: 2,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {product.brand && <span style={{ color: 'var(--ink-3)' }}>{product.brand}</span>}
          {product.brand && product.weight && <span style={{ color: 'var(--ink-5)' }}>·</span>}
          {product.weight && <span className="mono">{product.weight}</span>}
        </div>
      </div>
      <div style={{ color: 'var(--ink-5)' }}><Icon.ChevronRight s={14}/></div>
    </button>
  );
}

export function Catalogue() {
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  // Debounced fetch
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      setErr(null);
      try {
        const data = await searchProducts({ query: q.trim(), category: cat, limit: 100 });
        if (!cancelled) setProducts(data);
      } catch (e) {
        if (!cancelled) setErr(e.message || 'Erreur de chargement');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, q ? 200 : 0);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q, cat]);

  // If query looks like an EAN (8-13 digits), offer to jump straight to the product
  const eanShortcut = useMemo(() => {
    const t = q.trim();
    return /^\d{8,13}$/.test(t) ? t : null;
  }, [q]);

  return (
    <div className="app-shell">
      {/* Header */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'var(--canvas)',
        borderBottom: '0.5px solid var(--line)',
        padding: '12px 16px 10px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>Catalogue</h1>
          <div style={{ fontSize: 12, color: 'var(--ink-4)' }} className="mono">
            {loading ? '…' : `${products.length} résultats`}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', left: 10, top: 0, bottom: 0,
            display: 'flex', alignItems: 'center', color: 'var(--ink-4)', pointerEvents: 'none',
          }}>
            <Icon.Search s={16}/>
          </div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Chercher un produit ou coller un EAN"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            style={{
              fontFamily: 'inherit', font: '400 14px/1.5 var(--font-sans)',
              height: 38, paddingLeft: 34, paddingRight: q ? 34 : 12,
              border: '1px solid var(--hairline-strong)',
              borderRadius: 8, background: 'var(--canvas)',
              color: 'var(--charcoal)', width: '100%', outline: 'none',
            }}
          />
          {q && (
            <button onClick={() => setQ('')} style={{
              position: 'absolute', right: 6, top: 6, width: 26, height: 26,
              border: 'none', background: 'transparent', borderRadius: 6, cursor: 'pointer',
              color: 'var(--ink-4)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Icon.Close s={14}/>
            </button>
          )}
        </div>

        {/* Quick action — go to scanned EAN */}
        {eanShortcut && (
          <button
            onClick={() => nav(`/p/${eanShortcut}`)}
            className="focus-ring"
            style={{
              marginTop: 8,
              display: 'flex', alignItems: 'center', gap: 8,
              width: '100%', height: 36, padding: '0 12px',
              border: '1px solid var(--primary)',
              borderRadius: 8,
              background: 'var(--tint-lavender)',
              color: 'var(--brand-purple-800)',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 500,
              cursor: 'pointer',
            }}>
            <Icon.ArrowDown s={14}/>
            <span>Ouvrir EAN <span className="mono">{eanShortcut}</span></span>
          </button>
        )}

        {/* Category chips */}
        <div className="no-sb" style={{
          display: 'flex', gap: 6, marginTop: 10,
          overflowX: 'auto', WebkitOverflowScrolling: 'touch',
          marginLeft: -16, marginRight: -16, padding: '0 16px',
        }}>
          <button
            className={'chip' + (cat === null ? ' is-active' : '')}
            onClick={() => setCat(null)}
            style={{ flex: '0 0 auto' }}
          >Tous</button>
          {CATEGORIES.map(c => (
            <button
              key={c}
              className={'chip' + (cat === c ? ' is-active' : '')}
              onClick={() => setCat(cat === c ? null : c)}
              style={{ flex: '0 0 auto' }}
            >{c}</button>
          ))}
        </div>
      </header>

      {/* List */}
      <main style={{ flex: 1, paddingBottom: 96 }}>
        {err && (
          <div style={{ padding: 16, color: 'var(--err)', fontSize: 13 }}>
            {err}
          </div>
        )}
        {!err && !loading && products.length === 0 && (
          <div style={{ padding: 32, textAlign: 'center', color: 'var(--ink-4)', fontSize: 14 }}>
            Aucun produit trouvé
          </div>
        )}
        {products.map(p => (
          <ProductRow key={p.ean} product={p} onClick={() => nav(`/p/${p.ean}`)}/>
        ))}
      </main>

      {/* Floating scan button */}
      <button
        onClick={() => nav('/scan')}
        aria-label="Scanner"
        className="focus-ring"
        style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          width: 56, height: 56, borderRadius: 99,
          background: 'var(--primary)', color: 'white',
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--sh-3)',
          zIndex: 20,
        }}>
        <Icon.Scan s={24} c="white"/>
      </button>
    </div>
  );
}
