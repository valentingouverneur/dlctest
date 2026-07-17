import React, { useMemo, useState } from 'react';

const W = 720, H = 240, PAD = { t: 16, r: 18, b: 30, l: 44 };

/**
 * Cumulative CA concentration: refs ranked by CA desc, y = cumulative % of CA.
 * Single primary line + 10% area wash, 80% marker with direct label,
 * crosshair tooltip on hover.
 */
export function ParetoCurve({ rows }) {
  const [hover, setHover] = useState(null); // rank index (0-based)

  const model = useMemo(() => {
    const sorted = rows.filter(r => (r.ca_ttc || 0) > 0).sort((a, b) => b.ca_ttc - a.ca_ttc);
    if (sorted.length < 3) return null;
    const total = sorted.reduce((s, r) => s + r.ca_ttc, 0);
    let cum = 0;
    const pcts = sorted.map(r => { cum += r.ca_ttc; return cum / total * 100; });
    const n80 = pcts.findIndex(p => p >= 80) + 1;
    const x = i => PAD.l + (i / (sorted.length - 1)) * (W - PAD.l - PAD.r);
    const y = p => H - PAD.b - (p / 100) * (H - PAD.t - PAD.b);
    const path = pcts.map((p, i) => (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(p).toFixed(1)).join(' ');
    const area = path + ' L' + x(pcts.length - 1).toFixed(1) + ' ' + y(0) + ' L' + x(0) + ' ' + y(0) + ' Z';
    return { pcts, n80, x, y, path, area, count: sorted.length };
  }, [rows]);

  if (!model) return null;
  const { pcts, n80, x, y, path, area, count } = model;

  const handleMove = e => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const vx = ratio * W;
    const i = Math.round((vx - PAD.l) / (W - PAD.l - PAD.r) * (count - 1));
    setHover(i >= 0 && i < count ? i : null);
  };

  return (
    <div style={{ position: 'relative', padding: '8px 4px 4px' }}>
      <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseMove={handleMove} onMouseLeave={() => setHover(null)}>
        {[0, 25, 50, 75, 100].map(p => (
          <g key={p}>
            <line x1={PAD.l} y1={y(p)} x2={W - PAD.r} y2={y(p)} stroke="var(--hairline)" strokeWidth="1"/>
            <text x={PAD.l - 6} y={y(p) + 3} textAnchor="end" fontSize="10" fill="var(--stone)" fontFamily="var(--font-mono)">{p}%</text>
          </g>
        ))}
        <path d={area} fill="var(--primary)" opacity="0.08"/>
        <path d={path} fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
        {/* 80% marker + guides + direct label */}
        <line x1={x(n80 - 1)} y1={y(pcts[n80 - 1])} x2={x(n80 - 1)} y2={H - PAD.b} stroke="var(--hairline-strong)" strokeWidth="1"/>
        <circle cx={x(n80 - 1)} cy={y(pcts[n80 - 1])} r="4" fill="var(--primary)" stroke="var(--canvas)" strokeWidth="2"/>
        <text x={Math.min(x(n80 - 1) + 8, W - 190)} y={y(pcts[n80 - 1]) - 8} fontSize="11" fontWeight="600" fill="var(--charcoal)">
          {n80 + ' réfs → 80 % du CA'}
        </text>
        <text x={x(n80 - 1)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="var(--steel)" fontFamily="var(--font-mono)">{n80}</text>
        {/* End tick */}
        <text x={W - PAD.r} y={H - PAD.b + 16} textAnchor="end" fontSize="10" fill="var(--stone)" fontFamily="var(--font-mono)">{count} réfs</text>
        {/* Crosshair */}
        {hover != null && (
          <g>
            <line x1={x(hover)} y1={PAD.t} x2={x(hover)} y2={H - PAD.b} stroke="var(--hairline-strong)" strokeWidth="1"/>
            <circle cx={x(hover)} cy={y(pcts[hover])} r="4" fill="var(--primary)" stroke="var(--canvas)" strokeWidth="2"/>
          </g>
        )}
      </svg>
      {hover != null && (
        <div style={{
          position: 'absolute', left: (x(hover) / W * 100) + '%', top: (y(pcts[hover]) / H * 100) + '%',
          transform: 'translate(-50%, calc(-100% - 12px))',
          background: 'var(--charcoal)', color: 'white', padding: '5px 9px', borderRadius: 6,
          fontSize: 11, pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5, boxShadow: 'var(--sh-2)',
        }}>
          Top {hover + 1} réfs · {pcts[hover].toFixed(0)} % du CA
        </div>
      )}
    </div>
  );
}
