import React from 'react';
import { signedMoney } from '../../lib/format';

/**
 * Diverging horizontal bars: CA delta per ref vs previous week.
 * Polarity wears status tokens (gain/loss IS good/bad here); every bar
 * carries a visible signed label — the green fill alone is sub-3:1.
 */
export function DeltaBars({ items, onSelectEan }) {
  if (!items || items.length === 0) return null;
  const max = Math.max(...items.map(it => Math.abs(it.delta)), 1);

  return (
    <div style={{ padding: '6px 12px 10px' }}>
      {items.map((it, i) => {
        const pos = it.delta >= 0;
        const w = Math.abs(it.delta) / max * 50; // % of half-track
        return (
          <div key={it.ean + i}
            onClick={onSelectEan ? () => onSelectEan(it.ean) : undefined}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--tint-lavender)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            style={{
              display: 'grid', gridTemplateColumns: 'minmax(120px, 190px) 1fr 86px',
              gap: 10, alignItems: 'center', height: 28, padding: '0 4px',
              borderRadius: 4, cursor: onSelectEan ? 'pointer' : 'default',
              transition: 'background 0.07s',
            }}>
            <div style={{ fontSize: 12, color: 'var(--charcoal)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {it.designation}
            </div>
            <div style={{ position: 'relative', height: 14 }}>
              {/* Center baseline */}
              <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1, background: 'var(--hairline-strong)' }}/>
              <div style={{
                position: 'absolute', top: 0, height: 14,
                left: pos ? '50%' : (50 - w) + '%',
                width: w + '%',
                background: pos ? 'var(--success)' : 'var(--error)',
                borderRadius: pos ? '0 4px 4px 0' : '4px 0 0 4px',
              }}/>
            </div>
            <div style={{
              fontSize: 11, fontFamily: 'var(--font-mono)', textAlign: 'right',
              color: 'var(--charcoal)', fontWeight: 500,
            }}>
              {signedMoney(it.delta)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
