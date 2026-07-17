import React from 'react';
import { Sparkline } from './Sparkline';

/**
 * Stat tile: label / value / optional delta vs previous week / optional trend.
 * Delta color = direction x whether up is good (dataviz stat-tile contract);
 * the arrow makes it never color-alone.
 */
export function KpiTile({ label, value, sub, delta, upIsGood = true, trend }) {
  const hasDelta = delta != null && Number.isFinite(delta);
  const up = hasDelta && delta >= 0;
  const good = hasDelta && up === upIsGood;
  return (
    <div style={{
      flex: 1, minWidth: 130,
      borderRadius: 8, border: '0.5px solid var(--hairline)',
      padding: '10px 12px', background: 'var(--canvas)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 2 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--charcoal)', letterSpacing: '-0.02em' }}>{value}</div>
        {trend && <Sparkline points={trend}/>}
      </div>
      <div style={{ fontSize: 11, marginTop: 2, display: 'flex', gap: 6, alignItems: 'baseline', minHeight: 14 }}>
        {hasDelta && (
          <span style={{ color: good ? 'var(--success)' : 'var(--error)', fontWeight: 600 }}>
            {(up ? '▲ +' : '▼ −') + Math.abs(delta * 100).toFixed(1).replace('.', ',') + ' %'}
          </span>
        )}
        {sub && <span style={{ color: 'var(--steel)' }}>{sub}</span>}
      </div>
    </div>
  );
}
