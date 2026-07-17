import React from 'react';

/**
 * Micro trend line for stat tiles. Line in the de-emphasis hue, last point
 * accented with a 2px canvas ring (dataviz mark spec).
 */
export function Sparkline({ points, width = 64, height = 22, color = 'var(--stone)', accent = 'var(--primary)' }) {
  if (!points || points.filter(v => v != null).length < 2) return null;
  const vals = points.map(v => v || 0);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pad = 4;
  const xs = vals.map((_, i) => pad + (i / (vals.length - 1)) * (width - 2 * pad));
  const ys = vals.map(v => height - pad - ((v - min) / span) * (height - 2 * pad));
  const d = xs.map((x, i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + ys[i].toFixed(1)).join(' ');
  return (
    <svg width={width} height={height} viewBox={'0 0 ' + width + ' ' + height} aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="3.5" fill={accent} stroke="var(--canvas)" strokeWidth="2"/>
    </svg>
  );
}
