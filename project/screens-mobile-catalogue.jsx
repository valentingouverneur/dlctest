// DLC v2 — Mobile screens (Catalogue + Scanner + Sheet + secondary)

const { useState: mUseState, useEffect: mUseEffect, useRef: mUseRef, useMemo: mUseMemo } = React;

// ─── Mobile App Bar ────────────────────────────────────────────────
function MobileBar({ title, onMenu, onScan, scanCount, leftAction, rightActions }) {
  return (
    <div style={{
      flex: '0 0 auto',
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 12px 10px',
      background: 'var(--bg)',
      borderBottom: '0.5px solid var(--line)',
      minHeight: 52,
    }}>
      {leftAction || (
        <button onClick={onMenu} className="btn btn-ghost focus-ring" style={{ width: 38, height: 38, padding: 0, justifyContent: 'center' }}>
          <Icon.Menu s={20}/>
        </button>
      )}
      <div style={{
        flex: 1, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em',
        color: 'var(--ink)',
      }}>{title}</div>
      {rightActions}
      {onScan && (
        <button onClick={onScan} className="focus-ring" style={{
          width: 38, height: 38, borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--ink)', color: 'white',
          border: 'none', cursor: 'pointer', position: 'relative',
        }}>
          <Icon.Scan s={20} c="white"/>
          {scanCount > 0 && (
            <div style={{
              position: 'absolute', top: -4, right: -4,
              minWidth: 18, height: 18, padding: '0 5px',
              borderRadius: 99, background: 'var(--accent)',
              color: 'white', fontSize: 10, fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '2px solid var(--bg)',
            }}>{scanCount}</div>
          )}
        </button>
      )}
    </div>
  );
}

// ─── Catalogue (home) ──────────────────────────────────────────────
function CatalogueMobile({ onOpenProduct, onScan, onMenu, scanCount = 12, products }) {
  const [q, setQ] = mUseState('');
  const [cat, setCat] = mUseState('Tous');
  const cats = ['Tous', 'Surgelés', 'Frais', 'Épicerie'];

  const list = products.filter(p => {
    if (cat !== 'Tous' && p.cat !== cat) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return p.title.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s) || p.ean.includes(q);
  });

  return (
    <div className="scr">
      <MobileBar title="Catalogue" onMenu={onMenu} onScan={onScan} scanCount={scanCount}/>

      {/* search */}
      <div style={{ padding: '12px 16px 8px', background: 'var(--bg)' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          height: 40, padding: '0 12px',
          background: 'var(--surface)',
          border: '0.5px solid var(--line-strong)',
          borderRadius: 10,
        }}>
          <Icon.Search s={16} c="var(--ink-4)"/>
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Titre, marque ou EAN…"
            style={{
              flex: 1, border: 'none', background: 'transparent',
              outline: 'none', fontFamily: 'inherit', fontSize: 14,
              color: 'var(--ink)',
            }}
          />
          <span className="kbd" style={{ fontSize: 10 }}>1 712</span>
        </div>
      </div>

      {/* category chips */}
      <div style={{
        display: 'flex', gap: 6, padding: '4px 16px 8px',
        overflowX: 'auto', flexShrink: 0,
      }} className="no-sb">
        {cats.map(c => (
          <button key={c}
            onClick={() => setCat(c)}
            className={'chip' + (c === cat ? ' is-active' : '')}>
            {c}
            {c !== 'Tous' && c === cat && <span className="mono" style={{ opacity: 0.7 }}>{products.filter(p => p.cat === c).length}</span>}
          </button>
        ))}
      </div>

      {/* recent scans label */}
      <div style={{
        flex: 1, overflow: 'auto', background: 'var(--surface)',
        borderTop: '0.5px solid var(--line)',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 16px 6px',
        }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--ink-4)',
          }}>Récemment scannés</div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{scanCount} aujourd'hui</span>
        </div>
        {list.slice(0, 2).map(p => (
          <ProductRow key={'r-' + p.ean} product={p} onClick={() => onOpenProduct(p)} recent/>
        ))}
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--ink-4)',
          padding: '18px 16px 6px',
        }}>Tous · {list.length}</div>
        {list.slice(2).map(p => (
          <ProductRow key={p.ean} product={p} onClick={() => onOpenProduct(p)}/>
        ))}
        <div style={{ height: 100 }}/>
      </div>

      {/* hint footer */}
      <div style={{
        position: 'absolute', bottom: 44, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', pointerEvents: 'none',
      }}>
        <button onClick={onScan} style={{
          pointerEvents: 'auto',
          height: 48, padding: '0 18px 0 16px',
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'var(--ink)', color: 'white',
          border: 'none', borderRadius: 99, cursor: 'pointer',
          fontFamily: 'inherit', fontSize: 14, fontWeight: 500,
          boxShadow: '0 8px 24px rgba(20,18,14,0.22), 0 2px 6px rgba(20,18,14,0.12)',
        }}>
          <Icon.Scan s={18} c="white"/>
          Scanner un produit
        </button>
      </div>
    </div>
  );
}

window.CatalogueMobile = CatalogueMobile;
