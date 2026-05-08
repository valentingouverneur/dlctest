// DLC v2 — Product sheet (mobile, sheet from scanner) + secondary screens

const { useState: phUseState } = React;

// ─── Sheet container with drag-handle ──────────────────────────────
function Sheet({ children, height = 'auto', maxHeight = 720, animate = true }) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0,
      maxHeight,
      background: 'var(--surface)',
      borderTopLeftRadius: 18, borderTopRightRadius: 18,
      boxShadow: 'var(--sh-sheet)',
      display: 'flex', flexDirection: 'column',
      animation: animate ? 'sheet-up .35s cubic-bezier(.2,.8,.25,1)' : 'none',
      maxHeight: '90%',
      overflow: 'hidden',
      zIndex: 30,
    }}>
      <div style={{
        flex: '0 0 auto',
        display: 'flex', justifyContent: 'center',
        padding: '8px 0 4px',
      }}>
        <div style={{
          width: 36, height: 4, borderRadius: 99,
          background: 'rgba(20,18,14,0.18)',
        }}/>
      </div>
      {children}
    </div>
  );
}

// ─── Detected status bar (between viewfinder & sheet) ─────────────
function DetectedBadge({ ean }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '8px 14px',
      background: 'oklch(0.95 0.06 145)',
      borderBottom: '0.5px solid var(--line)',
      fontSize: 12,
    }}>
      <div style={{
        width: 18, height: 18, borderRadius: 99,
        background: 'oklch(0.55 0.13 155)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Icon.Check s={11} c="white" w={3}/>
      </div>
      <span style={{ color: 'oklch(0.35 0.13 155)', fontWeight: 500 }}>Détecté</span>
      <span className="mono" style={{ color: 'oklch(0.40 0.10 155)', flex: 1 }}>{ean}</span>
      <span style={{ color: 'oklch(0.45 0.05 155)' }}>swipe ↓ rescan</span>
    </div>
  );
}

// ─── Sheet body content (used both from scan & from list) ────────
function ProductSheetContent({ product, onClose, fromScan = false, onEdit, embedded = false }) {
  if (!product) return null;
  return (
    <>
      {fromScan && <DetectedBadge ean={product.ean}/>}

      <div style={{ flex: 1, overflow: 'auto' }} className="no-sb">
        {/* Hero packshot */}
        <div style={{
          padding: '20px 20px 4px',
          display: 'flex', justifyContent: 'center',
          background: `linear-gradient(180deg, ${product.color}55 0%, transparent 100%)`,
        }}>
          <Packshot product={product} size={180} radius={14}/>
        </div>

        {/* Title block */}
        <div style={{ padding: '16px 20px 4px' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--ink-4)',
            marginBottom: 6,
          }}>{product.cat}</div>
          <div style={{
            fontSize: 22, fontWeight: 600, lineHeight: 1.2,
            letterSpacing: '-0.015em',
            color: 'var(--ink)',
            textWrap: 'pretty',
          }}>{product.title}</div>
        </div>

        {/* Copy fields */}
        <div style={{ padding: '12px 20px 4px' }}>
          <CopyField label="Titre" value={product.title}/>
          <CopyField label="Marque" value={product.brand}/>
          <CopyField label="Poids" value={product.weight} mono/>
          <CopyField label="EAN" value={product.ean} mono/>
        </div>

        {/* Edit/secondary */}
        <div style={{
          padding: '8px 20px 20px',
          display: 'flex', gap: 8,
          borderTop: '0.5px solid var(--line)',
          marginTop: 4,
        }}>
          <button onClick={onEdit} className="btn" style={{ flex: 1, height: 40 }}>
            <Icon.Edit s={14}/> Corriger
          </button>
          <button className="btn" style={{ flex: 1, height: 40 }}>
            <Icon.Calendar s={14}/> Ajouter DLC
          </button>
        </div>
        <div style={{ height: 16 }}/>
      </div>
    </>
  );
}

// ─── Mobile fiche depuis liste (full-screen, not sheet) ──────────
function FicheMobile({ product, onBack, onScan }) {
  return (
    <div className="scr">
      <MobileBar
        title=""
        leftAction={
          <button onClick={onBack} className="btn btn-ghost" style={{ height: 38, padding: '0 10px' }}>
            <Icon.ChevronRight s={16} c="currentColor" style={{ transform: 'rotate(180deg)' }}/>
            <span style={{ marginLeft: 2 }}>Catalogue</span>
          </button>
        }
        onScan={onScan}
        scanCount={12}
      />
      <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface)' }}>
        <ProductSheetContent product={product} fromScan={false}/>
      </div>
    </div>
  );
}

// ─── Mobile EAN non trouvé ─────────────────────────────────────────
function NotFoundMobile({ ean = '3017624999999', onClose, onCreate }) {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      background: '#0A0908', overflow: 'hidden',
    }}>
      <CameraBG blur={2}/>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}/>
      <button onClick={onClose} style={{
        position: 'absolute', top: 65, right: 14, zIndex: 10,
        width: 38, height: 38, borderRadius: 99,
        background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.Close s={18} c="white"/>
      </button>
      <Sheet>
        <div style={{
          padding: '8px 14px',
          background: 'oklch(0.96 0.05 70)',
          borderBottom: '0.5px solid var(--line)',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12,
        }}>
          <Icon.Warn s={14} c="oklch(0.50 0.14 70)"/>
          <span style={{ color: 'oklch(0.40 0.14 70)', fontWeight: 500 }}>Non trouvé</span>
          <span className="mono" style={{ color: 'oklch(0.45 0.10 70)', flex: 1 }}>{ean}</span>
        </div>
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{
            fontSize: 20, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--ink)',
            marginBottom: 4,
          }}>Nouveau produit</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', lineHeight: 1.45 }}>
            Cet EAN n'existe pas dans le catalogue. Renseigne les infos du produit en main.
          </div>
        </div>
        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="EAN" value={ean} mono readOnly/>
          <Field label="Titre" placeholder="Ex. Cordon Bleu de Volaille x4"/>
          <Field label="Marque" placeholder="Ex. Le Gaulois"/>
          <Field label="Poids" placeholder="Ex. 400 g" mono/>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <FieldChips label="Catégorie" options={['Surgelés', 'Frais', 'Épicerie']} active="Frais"/>
          </div>
        </div>
        <div style={{
          padding: '14px 20px 20px',
          display: 'flex', gap: 8,
          borderTop: '0.5px solid var(--line)',
        }}>
          <button onClick={onClose} className="btn" style={{ flex: 1, height: 44 }}>Annuler</button>
          <button onClick={onCreate} className="btn btn-primary" style={{ flex: 2, height: 44 }}>
            <Icon.Plus s={14} c="white"/> Créer la fiche
          </button>
        </div>
      </Sheet>
    </div>
  );
}

function Field({ label, value, placeholder, mono, readOnly }) {
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--ink-4)',
        marginBottom: 6,
      }}>{label}</div>
      <input className="input" defaultValue={value} placeholder={placeholder}
        readOnly={readOnly}
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          background: readOnly ? 'var(--bg-2)' : 'var(--surface)',
          color: readOnly ? 'var(--ink-3)' : 'var(--ink)',
        }}/>
    </div>
  );
}

function FieldChips({ label, options, active }) {
  const [a, setA] = phUseState(active);
  return (
    <div style={{ gridColumn: '1 / -1' }}>
      <div style={{
        fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
        textTransform: 'uppercase', color: 'var(--ink-4)',
        marginBottom: 6,
      }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        {options.map(o => (
          <button key={o} onClick={() => setA(o)}
            className={'chip' + (o === a ? ' is-active' : '')}
            style={{ flex: 1, justifyContent: 'center' }}>{o}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Mobile plusieurs résultats (disambiguation) ───────────────────
function MultipleResultsMobile({ ean, results, onPick, onClose }) {
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#0A0908', overflow: 'hidden' }}>
      <CameraBG blur={2}/>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}/>
      <button onClick={onClose} style={{
        position: 'absolute', top: 65, right: 14, zIndex: 10,
        width: 38, height: 38, borderRadius: 99,
        background: 'rgba(255,255,255,0.12)', border: 'none', cursor: 'pointer',
        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.Close s={18} c="white"/>
      </button>
      <Sheet>
        <div style={{ padding: '14px 20px 4px' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
            textTransform: 'uppercase', color: 'var(--ink-4)',
          }}>{results.length} fiches pour</div>
          <div className="mono" style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 2 }}>{ean}</div>
        </div>
        <div style={{ padding: '8px 0' }}>
          {results.map(p => (
            <ProductRow key={p.ean + p.weight} product={p} onClick={() => onPick(p)}/>
          ))}
        </div>
        <div style={{
          padding: '12px 20px 18px',
          borderTop: '0.5px solid var(--line)',
        }}>
          <button className="btn" style={{ width: '100%', height: 40, justifyContent: 'center' }}>
            <Icon.Plus s={14}/> Aucune ne correspond — créer
          </button>
        </div>
      </Sheet>
    </div>
  );
}

// ─── Burger menu mobile ────────────────────────────────────────────
function BurgerMobile({ onClose, onOpen }) {
  const items = [
    { label: 'Catalogue', icon: <Icon.Catalog s={18}/>, count: '1 712', target: 'catalogue' },
    { label: 'Calendrier DLC', icon: <Icon.Calendar s={18}/>, count: '6', target: 'dlc' },
    { label: 'Paramètres', icon: <Icon.Settings s={18}/>, target: 'settings' },
  ];
  return (
    <div className="scr">
      <MobileBar title="DLC" leftAction={<div style={{ width: 38 }}/>} rightActions={
        <button onClick={onClose} className="btn btn-ghost" style={{ width: 38, height: 38, padding: 0, justifyContent: 'center' }}>
          <Icon.Close s={18}/>
        </button>
      }/>

      <div style={{ padding: '12px 12px 4px' }}>
        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--ink-4)',
          padding: '10px 10px 8px',
        }}>Navigation</div>
        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--line)',
          borderRadius: 12, overflow: 'hidden',
        }}>
          {items.map((it, i) => (
            <button key={it.label} onClick={() => onOpen?.(it.target)} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '14px 16px',
              border: 'none', background: 'transparent', cursor: 'pointer',
              borderTop: i ? '0.5px solid var(--line)' : 'none',
              fontFamily: 'inherit', textAlign: 'left',
            }}>
              <span style={{ color: 'var(--ink-3)' }}>{it.icon}</span>
              <span style={{ flex: 1, fontSize: 15, color: 'var(--ink)' }}>{it.label}</span>
              {it.count && <span className="mono" style={{ fontSize: 12, color: 'var(--ink-4)' }}>{it.count}</span>}
              <Icon.ChevronRight s={14} c="var(--ink-5)"/>
            </button>
          ))}
        </div>

        <div style={{
          fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--ink-4)',
          padding: '20px 10px 8px',
        }}>Session</div>
        <div style={{
          background: 'var(--surface)',
          border: '0.5px solid var(--line)',
          borderRadius: 12, overflow: 'hidden',
          padding: 16,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 32, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--ink)', letterSpacing: '-0.02em' }}>12</div>
            <div style={{ fontSize: 11, color: 'var(--ink-4)' }}>aujourd'hui</div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>scans · démarrée à 14h32</div>
        </div>

        <div style={{ padding: '24px 10px 0', fontSize: 11, color: 'var(--ink-4)', fontFamily: 'var(--font-mono)' }}>
          DLC v2.0.3 · marie@magasin08
        </div>
      </div>
    </div>
  );
}

// ─── Calendrier DLC mobile ─────────────────────────────────────────
function DLCMobile({ items, onBack }) {
  const groups = items.reduce((acc, it) => {
    const k = it.daysLeft <= 1 ? 'Aujourd\'hui · demain' : it.daysLeft <= 7 ? 'Cette semaine' : 'Plus tard';
    (acc[k] ||= []).push(it);
    return acc;
  }, {});
  const order = ['Aujourd\'hui · demain', 'Cette semaine', 'Plus tard'];

  return (
    <div className="scr">
      <MobileBar title="Calendrier DLC" leftAction={
        <button onClick={onBack} className="btn btn-ghost" style={{ width: 38, height: 38, padding: 0, justifyContent: 'center' }}>
          <Icon.Menu s={20}/>
        </button>
      } onScan={() => {}} scanCount={12}/>

      <div style={{ flex: 1, overflow: 'auto', background: 'var(--surface)' }}>
        {order.filter(g => groups[g]).map((g, gi) => (
          <div key={g}>
            <div style={{
              fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
              textTransform: 'uppercase',
              color: gi === 0 ? 'var(--err)' : 'var(--ink-4)',
              padding: '14px 16px 6px',
            }}>{g} · {groups[g].length}</div>
            {groups[g].map(it => (
              <div key={it.ean + it.dueDate} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 16px',
                borderBottom: '0.5px solid var(--line)',
              }}>
                <Packshot product={it} size={42} radius={6} hint={false}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--ink-4)', marginTop: 2 }}>
                    <span>{it.brand}</span>
                    <span style={{ margin: '0 6px', color: 'var(--ink-5)' }}>·</span>
                    <span className="mono">{it.weight}</span>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="mono" style={{
                    fontSize: 13, fontWeight: 500,
                    color: it.daysLeft <= 1 ? 'var(--err)' : it.daysLeft <= 3 ? 'oklch(0.50 0.14 70)' : 'var(--ink-3)',
                  }}>J{it.daysLeft === 0 ? '' : '−' + it.daysLeft}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-4)', marginTop: 1 }}>
                    {new Date(it.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Sheet, ProductSheetContent, FicheMobile, NotFoundMobile, MultipleResultsMobile, BurgerMobile, DLCMobile, DetectedBadge });
