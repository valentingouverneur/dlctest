// DLC v2 — Desktop screens (catalogue table + split view + edit)

const { useState: dUseState, useMemo: dUseMemo } = React;

// ─── Sidebar ───────────────────────────────────────────────────────
function DesktopSidebar({ active, onNav, items }) {
  return (
    <div style={{
      width: 220, flex: '0 0 220px',
      borderRight: '0.5px solid var(--line)',
      background: 'var(--bg)',
      display: 'flex', flexDirection: 'column',
      padding: '14px 12px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '4px 10px 14px',
      }}>
        <div style={{
          width: 22, height: 22, borderRadius: 5,
          background: 'var(--ink)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontFamily: 'var(--font-mono)',
          fontSize: 12, fontWeight: 600,
        }}>D</div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, letterSpacing: '-0.01em' }}>DLC</div>
        <span className="mono" style={{ fontSize: 10, color: 'var(--ink-4)' }}>v2</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <SideItem icon={<Icon.Catalog s={16}/>} label="Catalogue" count="1 712" active={active === 'catalogue'} onClick={() => onNav('catalogue')}/>
        <SideItem icon={<Icon.Calendar s={16}/>} label="Calendrier DLC" count="6" active={active === 'dlc'} onClick={() => onNav('dlc')}/>
        <SideItem icon={<Icon.Settings s={16}/>} label="Paramètres" active={active === 'settings'} onClick={() => onNav('settings')}/>
      </div>

      <div style={{ flex: 1 }}/>

      {/* session footer */}
      <div style={{
        padding: '10px',
        borderTop: '0.5px solid var(--line)',
        marginTop: 12,
      }}>
        <div style={{
          fontSize: 10, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--ink-4)',
          marginBottom: 6,
        }}>Session</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--ink)', letterSpacing: '-0.02em' }}>12</div>
          <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>scans aujourd'hui</div>
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 2 }}>marie@magasin08</div>
      </div>
    </div>
  );
}

// ─── Table row ─────────────────────────────────────────────────────
function TableRow({ product, selected, onSelect, onCopy, density = 'standard' }) {
  const heights = { compact: 30, standard: 38, comfort: 46 };
  const h = heights[density] || 38;
  const ps = { compact: 22, standard: 26, comfort: 32 };
  return (
    <div
      onClick={onSelect}
      style={{
        display: 'grid',
        gridTemplateColumns: '32px 1.7fr 1fr 90px 150px 120px',
        alignItems: 'center', gap: 12,
        padding: '0 16px', height: h,
        borderBottom: '0.5px solid var(--line)',
        background: selected ? 'var(--accent-soft)' : 'transparent',
        cursor: 'pointer',
        fontSize: 13,
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.background = 'rgba(20,18,14,0.025)'; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.background = 'transparent'; }}
    >
      <Packshot product={product} size={ps[density] || 26} radius={4} hint={false}/>
      <div style={{
        color: 'var(--ink)', fontWeight: 450,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{product.title}</span>
        {product.manual && <span title="Fiche manuelle, à vérifier" style={{
          flex: '0 0 auto',
          fontSize: 10, fontWeight: 600,
          padding: '1px 6px', borderRadius: 3,
          background: 'oklch(0.96 0.05 70)',
          color: 'oklch(0.42 0.14 70)',
          letterSpacing: '0.04em',
        }}>À CORRIGER</span>}
      </div>
      <div style={{ color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{product.brand}</div>
      <div className="mono" style={{ color: 'var(--ink-3)', fontSize: 12 }}>{product.weight}</div>
      <div className="mono" style={{ color: 'var(--ink-4)', fontSize: 12 }}>{product.ean}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        <Pill tone={product.cat === 'Surgelés' ? 'accent' : product.cat === 'Frais' ? 'ok' : 'neutral'}>{product.cat}</Pill>
      </div>
    </div>
  );
}

// ─── Table header ──────────────────────────────────────────────────
function TableHeader() {
  const cell = (label, opts = {}) => (
    <div style={{
      fontSize: 11, fontWeight: 600, letterSpacing: '0.04em',
      color: 'var(--ink-4)',
      textTransform: 'uppercase',
      display: 'flex', alignItems: 'center', gap: 4,
      ...opts,
    }}>{label}</div>
  );
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: '32px 1.7fr 1fr 90px 150px 120px',
      alignItems: 'center', gap: 12,
      padding: '0 16px', height: 32,
      borderBottom: '0.5px solid var(--line-strong)',
      background: 'var(--bg)',
      position: 'sticky', top: 0, zIndex: 1,
    }}>
      <div/>
      {cell('Titre')}
      {cell('Marque')}
      {cell('Poids')}
      {cell('EAN')}
      {cell('Catégorie', { justifyContent: 'flex-end' })}
    </div>
  );
}

// ─── Detail panel (right side) ─────────────────────────────────────
function DetailPanel({ product, editing = false, onEdit, onClose }) {
  if (!product) {
    return (
      <div style={{
        flex: '0 0 380px', borderLeft: '0.5px solid var(--line)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 32, color: 'var(--ink-4)', fontSize: 13,
        background: 'var(--bg)',
        textAlign: 'center', lineHeight: 1.5,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          border: '0.5px dashed var(--line-strong)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 14,
        }}>
          <Icon.Catalog s={18} c="var(--ink-5)"/>
        </div>
        Sélectionne un produit<br/>pour voir sa fiche
      </div>
    );
  }
  return (
    <div style={{
      flex: '0 0 380px', borderLeft: '0.5px solid var(--line)',
      display: 'flex', flexDirection: 'column',
      background: 'var(--surface)',
      overflow: 'hidden',
    }}>
      {/* header */}
      <div style={{
        display: 'flex', alignItems: 'center',
        padding: '8px 8px 8px 16px',
        borderBottom: '0.5px solid var(--line)',
        height: 44, flexShrink: 0,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--ink-4)', flex: 1,
        }}>Fiche produit</div>
        {!editing && <button onClick={onEdit} className="btn btn-ghost" style={{ height: 28 }}>
          <Icon.Edit s={13}/> Corriger
        </button>}
        <button onClick={onClose} className="btn btn-ghost" style={{ height: 28, width: 28, padding: 0, justifyContent: 'center' }}>
          <Icon.Close s={14}/>
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{
          padding: 24,
          display: 'flex', justifyContent: 'center',
          background: `linear-gradient(180deg, ${product.color}55 0%, transparent 100%)`,
        }}>
          <Packshot product={product} size={140} radius={12}/>
        </div>

        <div style={{ padding: '12px 20px 4px' }}>
          <Pill tone={product.cat === 'Surgelés' ? 'accent' : product.cat === 'Frais' ? 'ok' : 'neutral'}>{product.cat}</Pill>
          <div style={{
            fontSize: 18, fontWeight: 600, lineHeight: 1.25,
            color: 'var(--ink)', marginTop: 8,
            letterSpacing: '-0.01em', textWrap: 'pretty',
          }}>{product.title}</div>
        </div>

        {editing ? (
          <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Field label="Titre" value={product.title}/>
            <Field label="Marque" value={product.brand}/>
            <Field label="Poids" value={product.weight} mono/>
            <Field label="EAN" value={product.ean} mono readOnly/>
            <FieldChips label="Catégorie" options={['Surgelés', 'Frais', 'Épicerie']} active={product.cat}/>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={onEdit} className="btn" style={{ flex: 1, height: 36, justifyContent: 'center' }}>Annuler</button>
              <button className="btn btn-primary" style={{ flex: 1, height: 36, justifyContent: 'center' }}>Enregistrer</button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '8px 20px 20px' }}>
            <CopyField label="Titre" value={product.title}/>
            <CopyField label="Marque" value={product.brand}/>
            <CopyField label="Poids" value={product.weight} mono/>
            <CopyField label="EAN" value={product.ean} mono/>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Catalogue desktop (split view) ───────────────────────────────
function CatalogueDesktop({ products, selectedId, onSelect, editing, onEdit, onCloseDetail, activeNav = 'catalogue', onNav, hideSidebar = false, density = 'standard', toFix = false }) {
  const [q, setQ] = dUseState('');
  const [cat, setCat] = dUseState('Tous');
  const [paste, setPaste] = dUseState('');
  const [showFix, setShowFix] = dUseState(toFix);
  const cats = ['Tous', 'Surgelés', 'Frais', 'Épicerie'];
  const fixCount = products.filter(p => p.manual).length;

  const list = products.filter(p => {
    if (showFix && !p.manual) return false;
    if (cat !== 'Tous' && p.cat !== cat) return false;
    if (!q) return true;
    const s = q.toLowerCase();
    return p.title.toLowerCase().includes(s) || p.brand.toLowerCase().includes(s) || p.ean.includes(q);
  });

  const selected = products.find(p => p.ean === selectedId);

  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex',
      background: 'var(--bg)',
    }}>
      {!hideSidebar && <DesktopSidebar active={activeNav} onNav={onNav}/>}

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top toolbar */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 16px',
          borderBottom: '0.5px solid var(--line)',
          background: 'var(--bg)',
          flex: '0 0 auto',
        }}>
          <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Catalogue</div>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)', padding: '2px 7px', background: 'var(--bg-2)', borderRadius: 4 }}>1 712</span>

          {/* Paste EAN field */}
          <form onSubmit={(e) => { e.preventDefault(); if (paste) { setQ(paste); setPaste(''); } }}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              height: 30, padding: '0 4px 0 10px',
              background: 'var(--surface)',
              border: '0.5px solid var(--line-strong)',
              borderRadius: 6,
              marginLeft: 8,
            }}>
            <Icon.Scan s={13} c="var(--ink-4)"/>
            <input
              value={paste} onChange={(e) => setPaste(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="Coller EAN"
              maxLength={13}
              style={{
                width: 130, border: 'none', background: 'transparent',
                outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 12,
                letterSpacing: '0.02em',
              }}
            />
            <button type="submit" disabled={paste.length < 8} style={{
              height: 22, padding: '0 8px', borderRadius: 4,
              background: paste.length >= 8 ? 'var(--ink)' : 'var(--bg-2)',
              color: paste.length >= 8 ? 'white' : 'var(--ink-5)',
              border: 'none', fontSize: 11, fontWeight: 500,
              cursor: paste.length >= 8 ? 'pointer' : 'default',
              fontFamily: 'inherit',
            }}>↵</button>
          </form>

          <div style={{ flex: 1 }}/>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            height: 30, padding: '0 10px',
            background: 'var(--surface)',
            border: '0.5px solid var(--line-strong)',
            borderRadius: 6,
            width: 320,
          }}>
            <Icon.Search s={14} c="var(--ink-4)"/>
            <input
              value={q} onChange={e => setQ(e.target.value)}
              placeholder="Recherche…"
              style={{
                flex: 1, border: 'none', background: 'transparent',
                outline: 'none', fontFamily: 'inherit', fontSize: 12.5,
              }}
            />
            <span className="kbd" style={{ fontSize: 10 }}>⌘K</span>
          </div>
          <button className="btn"><Icon.Filter s={13}/> Filtres</button>
          <button className="btn btn-primary"><Icon.Plus s={13} c="white"/> Nouveau</button>
        </div>

        {/* Sub-toolbar: chips */}
        <div style={{
          display: 'flex', gap: 6, padding: '8px 16px',
          borderBottom: '0.5px solid var(--line)',
          background: 'var(--bg)',
          flex: '0 0 auto',
        }}>
          {cats.map(c => (
            <button key={c} onClick={() => { setCat(c); setShowFix(false); }}
              className={'chip' + (c === cat && !showFix ? ' is-active' : '')}>
              {c}
              {c !== 'Tous' && <span className="mono" style={{ opacity: c === cat ? 0.7 : 0.5 }}>{products.filter(p => p.cat === c).length}</span>}
            </button>
          ))}
          {fixCount > 0 && (
            <button onClick={() => setShowFix(s => !s)}
              className={'chip' + (showFix ? ' is-active' : '')}
              style={showFix ? { background: 'oklch(0.45 0.14 70)', borderColor: 'oklch(0.45 0.14 70)' } : { color: 'oklch(0.45 0.14 70)', borderColor: 'oklch(0.78 0.10 70)' }}>
              <Icon.Warn s={11}/> À corriger <span className="mono" style={{ opacity: 0.7 }}>{fixCount}</span>
            </button>
          )}
          <div style={{ flex: 1 }}/>
          <div style={{ fontSize: 11, color: 'var(--ink-4)', alignSelf: 'center' }}>
            <span className="mono">{list.length}</span> résultats
          </div>
        </div>

        {/* Split: table + detail */}
        <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
          <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface)' }}>
            <TableHeader/>
            {list.map(p => (
              <TableRow key={p.ean} product={p} density={density}
                selected={p.ean === selectedId}
                onSelect={() => onSelect(p.ean)}/>
            ))}
            <div style={{ height: 80 }}/>
          </div>

          {selected && <DetailPanel product={selected} editing={editing} onEdit={onEdit} onClose={onCloseDetail}/>}
          {!selected && <DetailPanel/>}
        </div>
      </div>
    </div>
  );
}

window.CatalogueDesktop = CatalogueDesktop;
window.DesktopSidebar = DesktopSidebar;
window.DetailPanel = DetailPanel;
