import React, { useMemo, useState } from 'react';
import { money } from '../../lib/format';

const W = 720, H = 340, PAD = { t: 18, r: 18, b: 36, l: 56 };
const CA_TICKS = [0, 50, 100, 300, 600, 1000, 2000, 5000];

/**
 * One dot per ref: x = marge %, y = CA TTC (sqrt scale), radius ~ UVC.
 * Quadrant guides at the "star" thresholds. Hover tooltip, click -> product.
 * Single series: every dot wears --primary (6.6:1), 2px canvas ring on hover.
 */
export function ScatterQuadrant({ rows, caThreshold = 300, margeThreshold = 20, onSelectEan }) {
  const [hover, setHover] = useState(null); // index into pts.data

  const pts = useMemo(() => {
    const data = rows.filter(r => (r.ca_ttc || 0) > 0 && r.mpaf_ht_pct != null);
    if (data.length < 3) return null;
    const maxCa = Math.max(...data.map(r => r.ca_ttc), caThreshold * 1.2);
    const maxMarge = Math.max(...data.map(r => r.mpaf_ht_pct), 45);
    const maxUvc = Math.max(...data.map(r => r.uvc || 0), 1);
    const x = v => PAD.l + (v / maxMarge) * (W - PAD.l - PAD.r);
    const y = v => H - PAD.b - (Math.sqrt(Math.max(v, 0)) / Math.sqrt(maxCa)) * (H - PAD.t - PAD.b);
    return {
      data: data.map(r => ({
        r, cx: x(r.mpaf_ht_pct), cy: y(r.ca_ttc),
        rad: 3 + 5 * Math.sqrt((r.uvc || 0) / maxUvc),
      })),
      x, y, maxMarge, maxCa, xT: x(margeThreshold), yT: y(caThreshold),
    };
  }, [rows, caThreshold, margeThreshold]);

  if (!pts) return null;
  const { data, x, y, maxMarge, xT, yT } = pts;
  const margeTicks = [];
  for (let v = 0; v <= maxMarge; v += 10) margeTicks.push(v);
  const caTicks = CA_TICKS.filter(v => v <= pts.maxCa);
  const hovered = hover != null ? data[hover] : null;

  return (
    <div style={{ position: 'relative', padding: '8px 4px 4px' }}>
      <svg viewBox={'0 0 ' + W + ' ' + H} style={{ width: '100%', height: 'auto', display: 'block' }}
        onMouseLeave={() => setHover(null)}>
        {/* Quadrant washes */}
        <rect x={xT} y={PAD.t} width={W - PAD.r - xT} height={yT - PAD.t} fill="var(--tint-mint)" opacity="0.35"/>
        <rect x={PAD.l} y={yT} width={xT - PAD.l} height={H - PAD.b - yT} fill="var(--tint-gray)" opacity="0.5"/>
        {/* Gridlines (hairline, solid) + axis ticks */}
        {margeTicks.map(v => (
          <g key={'x' + v}>
            <line x1={x(v)} y1={PAD.t} x2={x(v)} y2={H - PAD.b} stroke="var(--hairline)" strokeWidth="1"/>
            <text x={x(v)} y={H - PAD.b + 16} textAnchor="middle" fontSize="10" fill="var(--stone)" fontFamily="var(--font-mono)">{v}%</text>
          </g>
        ))}
        {caTicks.map(v => (
          <g key={'y' + v}>
            <line x1={PAD.l} y1={y(v)} x2={W - PAD.r} y2={y(v)} stroke="var(--hairline)" strokeWidth="1"/>
            <text x={PAD.l - 6} y={y(v) + 3} textAnchor="end" fontSize="10" fill="var(--stone)" fontFamily="var(--font-mono)">{v >= 1000 ? (v / 1000) + 'k' : v}</text>
          </g>
        ))}
        {/* Threshold guides */}
        <line x1={xT} y1={PAD.t} x2={xT} y2={H - PAD.b} stroke="var(--hairline-strong)" strokeWidth="1"/>
        <line x1={PAD.l} y1={yT} x2={W - PAD.r} y2={yT} stroke="var(--hairline-strong)" strokeWidth="1"/>
        {/* Quadrant labels (muted text tokens) */}
        <text x={W - PAD.r - 6} y={PAD.t + 14} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--steel)" letterSpacing="0.06em">STARS</text>
        <text x={PAD.l + 6} y={PAD.t + 14} fontSize="10" fontWeight="600" fill="var(--steel)" letterSpacing="0.06em">GROS CA · MARGE FAIBLE</text>
        <text x={PAD.l + 6} y={H - PAD.b - 8} fontSize="10" fontWeight="600" fill="var(--stone)" letterSpacing="0.06em">POIDS MORTS</text>
        <text x={W - PAD.r - 6} y={H - PAD.b - 8} textAnchor="end" fontSize="10" fontWeight="600" fill="var(--steel)" letterSpacing="0.06em">À POUSSER</text>
        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={d.cx} cy={d.cy} r={d.rad}
            fill="var(--primary)" fillOpacity={hover === i ? 0.95 : 0.45}
            stroke={hover === i ? 'var(--canvas)' : 'none'} strokeWidth="2"/>
        ))}
        {/* Hit targets (>= mark, min 8px radius) */}
        {data.map((d, i) => (
          <circle key={'h' + i} cx={d.cx} cy={d.cy} r={Math.max(d.rad + 4, 8)} fill="transparent"
            style={{ cursor: onSelectEan ? 'pointer' : 'default' }}
            onMouseEnter={() => setHover(i)}
            onClick={onSelectEan ? () => onSelectEan(d.r.ean) : undefined}/>
        ))}
      </svg>
      {/* Axis titles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--stone)', padding: '2px 8px 0', fontWeight: 600, letterSpacing: '0.06em' }}>
        <span>CA TTC (échelle √)</span>
        <span>MARGE MPAF HT %</span>
      </div>
      {/* Tooltip */}
      {hovered && (
        <div style={{
          position: 'absolute',
          left: (hovered.cx / W * 100) + '%',
          top: (hovered.cy / H * 100) + '%',
          transform: 'translate(-50%, calc(-100% - 12px))',
          background: 'var(--charcoal)', color: 'white',
          padding: '6px 10px', borderRadius: 6, fontSize: 11,
          pointerEvents: 'none', whiteSpace: 'nowrap', zIndex: 5,
          boxShadow: 'var(--sh-2)', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          <div style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{hovered.r.designation}</div>
          <div style={{ fontFamily: 'var(--font-mono)', opacity: 0.85 }}>
            {money(hovered.r.ca_ttc)} · {hovered.r.mpaf_ht_pct}% · {hovered.r.uvc || 0} UVC
          </div>
        </div>
      )}
    </div>
  );
}
