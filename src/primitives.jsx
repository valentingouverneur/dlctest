import React, { useState } from 'react';
import { Icon } from './icons';

// Stripe placeholder packshot. Renders brand initials in mono with per-product warm tint.
export function Packshot({ product, size = 96, radius = 10, hint = true, missing = false }) {
  if (missing) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: 'repeating-linear-gradient(135deg, #EFEDE8 0 6px, #E6E3DC 6px 12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-4)', position: 'relative', overflow: 'hidden',
        border: '0.5px solid var(--line)',
      }}>
        <Icon.Image s={Math.min(28, size * 0.32)} c="var(--ink-4)" />
      </div>
    );
  }
  if (product?.imageUrl) {
    return (
      <div style={{
        width: size, height: size, borderRadius: radius,
        background: '#fff',
        position: 'relative', overflow: 'hidden',
        border: '1px solid var(--hairline)',
      }}>
        <img src={product.imageUrl} alt={product.title}
          style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}/>
      </div>
    );
  }
  const catTint = {
    'Surgelés': 'var(--tint-sky)',
    'Frais': 'var(--tint-mint)',
    'Épicerie': 'var(--tint-peach)',
  };
  const tint = catTint[product?.cat] || product?.color || 'var(--tint-cream)';
  const initials = (product?.brand || '??').split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: radius,
      background: tint,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative', overflow: 'hidden',
      border: '0.5px solid rgba(20,18,14,0.06)',
      boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5), inset 0 -20px 30px -10px rgba(0,0,0,0.06)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'repeating-linear-gradient(135deg, transparent 0 14px, rgba(255,255,255,0.18) 14px 15px)',
        pointerEvents: 'none',
      }}/>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: Math.max(10, size * 0.18),
        fontWeight: 500,
        color: 'rgba(20,18,14,0.55)',
        letterSpacing: '0.04em',
        textAlign: 'center',
        position: 'relative', zIndex: 1,
        padding: '4px 8px',
      }}>
        {initials}
      </div>
      {hint && size >= 80 && (
        <div style={{
          position: 'absolute', bottom: 6, right: 8,
          fontFamily: 'var(--font-mono)', fontSize: 9,
          color: 'rgba(20,18,14,0.35)', letterSpacing: '0.06em',
        }}>PACKSHOT</div>
      )}
    </div>
  );
}

// Copyable field — label on top, value + copy button.
export function CopyField({ label, value, mono = false, large = false, onCopy }) {
  const [copied, setCopied] = useState(false);
  const handle = (e) => {
    e?.stopPropagation();
    setCopied(true);
    onCopy?.(label, value);
    setTimeout(() => setCopied(false), 1400);
  };
  return (
    <div style={{
      display: 'flex', alignItems: 'stretch',
      borderTop: '0.5px solid var(--line)',
      padding: '14px 0',
      gap: 12,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 11, fontWeight: 500, letterSpacing: '0.06em',
          textTransform: 'uppercase', color: 'var(--ink-4)',
          marginBottom: 4,
        }}>{label}</div>
        <div style={{
          fontFamily: mono ? 'var(--font-mono)' : 'inherit',
          fontSize: large ? 18 : 15,
          fontWeight: large ? 500 : 450,
          color: 'var(--ink)',
          lineHeight: 1.3,
          wordBreak: mono ? 'break-all' : 'normal',
        }}>{value || '—'}</div>
      </div>
      <button onClick={handle} className="focus-ring" style={{
        alignSelf: 'center',
        flex: '0 0 auto',
        height: 40, padding: '0 12px',
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: copied ? 'var(--ink)' : 'var(--surface)',
        color: copied ? 'white' : 'var(--ink-2)',
        border: '0.5px solid ' + (copied ? 'var(--ink)' : 'var(--line-strong)'),
        borderRadius: 8, fontFamily: 'inherit',
        fontSize: 12, fontWeight: 500, cursor: 'pointer',
        transition: 'all .15s',
        minWidth: 84,
        justifyContent: 'center',
      }}>
        {copied ? <><Icon.Check s={14}/> Copié</> : <><Icon.Copy s={14}/> Copier</>}
      </button>
    </div>
  );
}

// Mobile list row
export function ProductRow({ product, onClick, dense = false, recent = false }) {
  return (
    <button onClick={onClick} className="focus-ring" style={{
      display: 'flex', gap: 12, alignItems: 'center',
      width: '100%', textAlign: 'left',
      padding: dense ? '10px 16px' : '12px 16px',
      border: 'none', background: 'transparent', cursor: 'pointer',
      borderBottom: '0.5px solid var(--line)',
      fontFamily: 'inherit',
    }}>
      <Packshot product={product} size={dense ? 40 : 48} radius={6} hint={false}/>
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
          <span style={{ color: 'var(--ink-3)' }}>{product.brand}</span>
          <span style={{ color: 'var(--ink-5)' }}>·</span>
          <span className="mono">{product.weight}</span>
          {recent && <>
            <span style={{ color: 'var(--ink-5)' }}>·</span>
            <span style={{ color: 'var(--ink-4)' }}>il y a 2min</span>
          </>}
        </div>
      </div>
      <div style={{ color: 'var(--ink-5)' }}><Icon.ChevronRight s={14}/></div>
    </button>
  );
}

// Sidebar item (desktop)
export function SideItem({ icon, label, count, active, onClick }) {
  return (
    <button onClick={onClick} className="focus-ring" style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', height: 30, padding: '0 10px',
      border: 'none', background: active ? 'rgba(20,18,14,0.06)' : 'transparent',
      borderRadius: 6, cursor: 'pointer',
      color: active ? 'var(--ink)' : 'var(--ink-3)',
      fontFamily: 'inherit', fontSize: 13,
      fontWeight: active ? 500 : 450,
      textAlign: 'left',
    }}>
      <span style={{ display: 'flex' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {count != null && (
        <span className="mono" style={{ fontSize: 11, color: 'var(--ink-4)' }}>{count}</span>
      )}
    </button>
  );
}

// Status pill — Notion uses small rounded tags (6px radius)
export function Pill({ tone = 'neutral', children, size = 'sm' }) {
  const tones = {
    neutral: { bg: 'var(--tint-gray)', fg: 'var(--charcoal)' },
    accent:  { bg: 'var(--tint-lavender)', fg: 'var(--brand-purple-800)' },
    ok:      { bg: 'var(--tint-mint)', fg: 'var(--brand-green)' },
    warn:    { bg: 'var(--tint-peach)', fg: '#793400' },
    err:     { bg: 'var(--tint-rose)', fg: '#a02e6d' },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      height: size === 'sm' ? 22 : 26,
      padding: size === 'sm' ? '0 8px' : '0 10px',
      borderRadius: 6,
      background: t.bg, color: t.fg,
      fontSize: size === 'sm' ? 12 : 13, fontWeight: 600,
      fontFamily: 'inherit',
    }}>{children}</span>
  );
}
