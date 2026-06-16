import React, { useState, useCallback, useRef } from 'react';
import { Icon } from '../icons';

// CSV parser (client-side, no deps)
function parseCsv(text) {
  const rows = [];
  const lines = text.split('\n');
  let headerIdx = -1;

  for (let i = 0; i < lines.length; i++) {
    const cols = lines[i].split(';').map(c => c.trim());
    if (cols[0] === 'EAN') { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { error: 'Format CSV non reconnu' };

  const dataRows = lines.slice(headerIdx + 1);
  for (const line of dataRows) {
    const cols = line.split(';');
    if (!cols[0] || !cols[0].trim().match(/^\d{8,}/)) continue;
    try {
      const p = {
        ean: cols[0]?.trim() || '',
        designation: cols[1]?.trim() || '',
        ca_ttc: parseFloat((cols[3] || '0').replace(',', '.')),
        uvc: parseInt(cols[5] || '0'),
        mpaf_ht_pct: parseFloat((cols[6] || '0').replace(',', '.')),
        panier: parseFloat((cols[10] || '0').replace(',', '.')),
        freq: parseInt(cols[11] || '0'),
        mpaf: parseFloat((cols[15] || '0').replace(',', '.')),
        casse_paf: parseFloat((cols[21] || '0').replace(',', '.')),
        casse_uvc: parseInt(cols[25] || '0'),
      };
      rows.push(p);
    } catch {}
  }
  return { rows, total: rows.reduce((s, r) => s + r.ca_ttc, 0), totalMpaf: rows.reduce((s, r) => s + r.mpaf, 0) };
}

function money(v) { return v.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' \u20AC'; }
function num(v) { return v.toLocaleString('fr-FR'); }

function riskScore(p) {
  if (p.uvc === 0) return -Infinity;
  return (p.ca_ttc / p.uvc) * (p.mpaf_ht_pct / 100);
}

function efficiency(p) {
  return p.ca_ttc * p.freq * (p.mpaf_ht_pct / 100);
}

function isStar(p) {
  return p.ca_ttc > 300 && p.mpaf_ht_pct > 20;
}

function MiniTable({ rows, columns, compact }) {
  const colWidth = {};
  columns.forEach(c => { colWidth[c.key] = c.width || 'auto'; });
  const gridCols = columns.map(c => colWidth[c.key] || 'auto').join(' ');
  const hoverBg = 'var(--tint-lavender)';
  return (
    <div style={{ fontSize: compact ? 12 : 13 }}>
      <div style={{
        display: 'grid', gridTemplateColumns: gridCols,
        gap: compact ? 6 : 10, alignItems: 'center',
        padding: '0 12px', height: 30,
        borderBottom: '0.5px solid var(--hairline)', background: 'var(--surface)',
        position: 'sticky', top: 0, zIndex: 1,
      }}>
        {columns.map(col => (
          <div key={col.key} style={{
            fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase',
            color: 'var(--stone)', textAlign: col.align || 'left',
          }}>{col.label}</div>
        ))}
      </div>
      <div style={{ maxHeight: compact ? 300 : 480, overflowY: 'auto' }}>
        {rows.map((row, i) => {
          const isEven = i % 2 === 0;
          const bg = row._highlight ? 'var(--tint-mint)' : (isEven ? 'transparent' : 'rgba(0,0,0,0.013)');
          const leaveBg = row._highlight ? 'var(--tint-mint)' : (isEven ? 'transparent' : 'rgba(0,0,0,0.013)');
          return (
            <div key={i}
              onMouseEnter={function(e) { e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = leaveBg; }}
              style={{
                display: 'grid', gridTemplateColumns: gridCols,
                gap: compact ? 6 : 10, alignItems: 'center',
                padding: '0 12px', height: compact ? 32 : 38,
                borderBottom: '0.5px solid var(--hairline-soft)',
                transition: 'background 0.07s',
                background: bg,
              }}
            >
              {columns.map(col => (
                <div key={col.key} style={{
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  textAlign: col.align || 'left',
                  fontFamily: col.mono ? 'var(--font-mono)' : 'inherit',
                  fontWeight: col.bold ? 500 : 400,
                  color: col.color || 'var(--charcoal)',
                }}>
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Section({ title, subtitle, icon, children, accent }) {
  return (
    <div style={{
      borderRadius: 10, border: '0.5px solid var(--hairline)',
      background: 'var(--canvas)', overflow: 'hidden',
      boxShadow: 'var(--sh-1)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '10px 14px',
        borderBottom: '0.5px solid var(--hairline)',
        background: accent ? ('var(--tint-' + accent + ')') : 'var(--canvas)',
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: accent ? ('var(--tint-' + accent + ')') : 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--charcoal)',
        }}>{icon}</div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--charcoal)' }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 1 }}>{subtitle}</div>}
        </div>
      </div>
      <div>{children}</div>
    </div>
  );
}

function StatCard({ label, value, sub, color }) {
  return (
    <div style={{
      flex: 1, minWidth: 120,
      borderRadius: 8, border: '0.5px solid var(--hairline)',
      padding: '10px 12px', background: 'var(--canvas)',
    }}>
      <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--font-mono)', color: color || 'var(--charcoal)', letterSpacing: '-0.02em' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function EmptyState({ onFile }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) onFile(file);
  }, [onFile]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48, gap: 14,
        border: dragging ? '2px dashed var(--primary)' : '1px dashed var(--hairline-strong)',
        borderRadius: 12,
        background: dragging ? 'var(--tint-lavender)' : 'var(--canvas)',
        cursor: 'pointer', transition: 'all 0.12s',
        minHeight: 240,
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f); }}
      />
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'var(--tint-lavender)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon.Catalog s={20} c="var(--primary)"/>
      </div>
      <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--charcoal)', textAlign: 'center' }}>
        Dépose ton fichier CSV ici
      </div>
      <div style={{ fontSize: 12, color: 'var(--steel)', textAlign: 'center', maxWidth: 300, lineHeight: 1.5 }}>
        ou clique pour sélectionner le fichier<br/>
        Export <strong>Statistiques vacances Abaco</strong> (format ; encodé UTF-8)
      </div>
    </div>
  );
}

function LoadingState({ message }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 64, gap: 14,
    }}>
      <Icon.Spinner s={28} c="var(--primary)"/>
      <div style={{ fontSize: 14, color: 'var(--steel)' }}>{message}</div>
    </div>
  );
}

export function Analyse() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setFileName(file.name);
    await new Promise(r => setTimeout(r, 200));
    try {
      const text = await file.text();
      const result = parseCsv(text);
      if (result.error) { setError(result.error); setLoading(false); return; }
      if (result.rows.length === 0) { setError('Aucune donnée trouvée dans le fichier.'); setLoading(false); return; }

      const rows = result.rows;
      const total = result.total;
      const totalMpaf = result.totalMpaf;
      const totalUvc = rows.reduce((s, r) => s + r.uvc, 0);

      const topCa = [...rows].sort((a, b) => b.ca_ttc - a.ca_ttc).slice(0, 15);
      const topMpaf = [...rows].sort((a, b) => b.mpaf - a.mpaf).slice(0, 15);
      const topEff = [...rows].sort((a, b) => efficiency(b) - efficiency(a)).slice(0, 15);
      const stars = [...rows].filter(r => isStar(r)).sort((a, b) => b.ca_ttc * b.mpaf_ht_pct - a.ca_ttc * a.mpaf_ht_pct).slice(0, 10);
      const risky = [...rows].filter(r => r.uvc > 0).sort((a, b) => riskScore(a) - riskScore(b)).slice(0, 20);
      const zeros = rows.filter(r => r.uvc === 0 && r.ca_ttc === 0);
      const casse = [...rows].filter(r => r.casse_paf > 0).sort((a, b) => b.casse_paf - a.casse_paf).slice(0, 10);

      setStats({ total, totalMpaf, totalUvc, rows: rows.length, topCa, topMpaf, topEff, stars, risky, zeros, casse });
      setLoading(false);
      setActiveTab('overview');
    } catch (e) {
      setError('Erreur de lecture : ' + e.message);
      setLoading(false);
    }
  }, []);

  const handleReset = () => {
    setStats(null);
    setError(null);
    setFileName(null);
  };

  const tabs = [
    { key: 'overview', label: 'Vue d\'ensemble' },
    { key: 'top', label: 'Top ventes' },
    { key: 'stars', label: 'Produits star' },
    { key: 'risky', label: 'À risque' },
    { key: 'casse', label: 'Casse' },
  ];

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      overflow: 'hidden', background: 'var(--surface)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 18px', flexShrink: 0,
        borderBottom: '0.5px solid var(--hairline)',
        background: 'var(--canvas)',
      }}>
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'var(--charcoal)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 13, fontWeight: 600,
          fontFamily: 'var(--font-mono)',
        }}>A</div>
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>Analyse rayon</div>
        {stats && (
          <button onClick={handleReset} className="btn btn-ghost" style={{ height: 28, fontSize: 12 }}>
            <Icon.Close s={12}/> Nouveau fichier
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {!stats && !loading && !error && (
          <div style={{ maxWidth: 420, margin: '40px auto' }}>
            <EmptyState onFile={handleFile}/>
          </div>
        )}

        {loading && <LoadingState message="Analyse en cours..."/>}

        {error && (
          <div style={{ maxWidth: 420, margin: '40px auto', textAlign: 'center' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 16px', borderRadius: 8,
              background: 'var(--tint-rose)', color: 'var(--error)',
              fontSize: 13, marginBottom: 16,
            }}>
              <Icon.Warn s={14} c="var(--error)"/>
              {error}
            </div>
            <br/>
            <button onClick={handleReset} className="btn" style={{ height: 32, fontSize: 12 }}>
              Réessayer
            </button>
          </div>
        )}

        {stats && (
          <>
            <div style={{ display: 'flex', gap: 4, marginBottom: 16, flexWrap: 'wrap' }}>
              {tabs.map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={activeTab === tab.key ? 'chip is-active' : 'chip'}
                  style={{ height: 30, fontSize: 12 }}
                >
                  {tab.label}
                </button>
              ))}
              <div style={{ flex: 1 }}/>
              <div style={{ fontSize: 11, color: 'var(--stone)', alignSelf: 'center' }}>
                {fileName}
              </div>
            </div>

            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <StatCard label="CA Total TTC" value={money(stats.total)}
                    sub={stats.rows + ' références'} color="var(--charcoal)"/>
                  <StatCard label="Marge (MPAF)" value={money(stats.totalMpaf)}
                    sub={(stats.totalMpaf / stats.total * 100).toFixed(1) + '% de marge'} color="var(--brand-green)"/>
                  <StatCard label="Unités vendues" value={num(stats.totalUvc)}
                    sub={stats.totalUvc > 0 ? (stats.total / stats.totalUvc).toFixed(2) + ' €/u' : ''} color="var(--primary)"/>
                  <StatCard label="Non vendus" value={num(stats.zeros.length)}
                    sub={stats.zeros.length > 0 ? 'À retirer du linéaire' : 'Rien à signaler'}
                    color={stats.zeros.length > 0 ? 'var(--warning)' : 'var(--steel)'}/>
                </div>

                {stats.stars.length > 0 && (
                  <Section title="Produits star" subtitle={stats.stars.length + ' produits avec CA > 300€ et marge > 20%'} icon={<Icon.Check s={14} c="var(--success)"/>} accent="mint">
                    <MiniTable compact columns={[
                      { key: '#', label: '#', width: '24px', align: 'right' },
                      { key: 'designation', label: 'Produit' },
                      { key: 'ca_ttc', label: 'CA TTC', width: '100px', align: 'right', mono: true, render: v => money(v) },
                      { key: 'mpaf_ht_pct', label: 'Marge', width: '70px', align: 'right', render: v => v + '%' },
                      { key: 'freq', label: 'Fréq.', width: '55px', align: 'right' },
                    ]} rows={stats.stars.map((r, i) => ({ ...r, '#': i + 1 }))}/>
                  </Section>
                )}

                {stats.risky.length > 0 && (
                  <Section title="Produits à risque" subtitle="Faible rotation + faible marge" icon={<Icon.Warn s={14} c="var(--error)"/>} accent="rose">
                    <MiniTable compact columns={[
                      { key: '#', label: '#', width: '24px', align: 'right' },
                      { key: 'designation', label: 'Produit' },
                      { key: 'ca_ttc', label: 'CA TTC', width: '90px', align: 'right', mono: true, render: v => money(v) },
                      { key: 'uvc', label: 'UVC', width: '55px', align: 'right' },
                      { key: 'mpaf_ht_pct', label: 'Marge', width: '65px', align: 'right', render: v => v + '%' },
                    ]} rows={stats.risky.slice(0, 10).map((r, i) => ({ ...r, '#': i + 1 }))}/>
                  </Section>
                )}

                {stats.casse.length > 0 && (
                  <Section title="Casse" subtitle={stats.casse.length + ' produits avec pertes'} icon={<Icon.Warn s={14} c="var(--warning)"/>} accent="peach">
                    <MiniTable compact columns={[
                      { key: '#', label: '#', width: '24px', align: 'right' },
                      { key: 'designation', label: 'Produit' },
                      { key: 'casse_paf', label: 'Pertes €', width: '90px', align: 'right', mono: true, render: v => money(v) },
                      { key: 'casse_uvc', label: 'U.', width: '40px', align: 'right' },
                      { key: 'ca_ttc', label: 'CA TTC', width: '90px', align: 'right', mono: true, render: v => money(v) },
                    ]} rows={stats.casse.map((r, i) => ({ ...r, '#': i + 1 }))}/>
                  </Section>
                )}

                {stats.zeros.length > 0 && (
                  <Section title="Non vendus" subtitle={stats.zeros.length + ' produits à 0 unité'} icon={<Icon.Close s={14} c="var(--stone)"/>}>
                    <div style={{ padding: 12, fontSize: 13, color: 'var(--steel)' }}>
                      {stats.zeros.map(p => (
                        <div key={p.ean} style={{ padding: '3px 0', display: 'flex', gap: 8 }}>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--stone)' }}>{p.ean}</span>
                          <span>{p.designation}</span>
                        </div>
                      ))}
                    </div>
                  </Section>
                )}
              </div>
            )}

            {activeTab === 'top' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Section title="Meilleures ventes (CA TTC)" icon={<Icon.Catalog s={14}/>}>
                  <MiniTable columns={[
                    { key: '#', label: '#', width: '30px', align: 'right' },
                    { key: 'designation', label: 'Produit' },
                    { key: 'ca_ttc', label: 'CA TTC', width: '110px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'mpaf_ht_pct', label: 'Marge %', width: '75px', align: 'right', render: v => v + '%' },
                    { key: 'mpaf', label: 'MPAF €', width: '100px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'uvc', label: 'UVC', width: '60px', align: 'right' },
                    { key: 'freq', label: 'Fréq.', width: '60px', align: 'right' },
                  ]} rows={stats.topCa.map((r, i) => ({ ...r, '#': i + 1 }))}/>
                </Section>
                <Section title="Meilleures marges (MPAF €)" icon={<Icon.Catalog s={14}/>}>
                  <MiniTable columns={[
                    { key: '#', label: '#', width: '30px', align: 'right' },
                    { key: 'designation', label: 'Produit' },
                    { key: 'mpaf', label: 'MPAF €', width: '110px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'mpaf_ht_pct', label: 'Marge %', width: '75px', align: 'right', render: v => v + '%' },
                    { key: 'ca_ttc', label: 'CA TTC', width: '110px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'uvc', label: 'UVC', width: '60px', align: 'right' },
                  ]} rows={stats.topMpaf.map((r, i) => ({ ...r, '#': i + 1 }))}/>
                </Section>
                <Section title="Meilleur rapport CA x marge x fréquence" icon={<Icon.Catalog s={14}/>}>
                  <MiniTable columns={[
                    { key: '#', label: '#', width: '30px', align: 'right' },
                    { key: 'designation', label: 'Produit' },
                    { key: '_score', label: 'Score', width: '100px', align: 'right', mono: true, render: (_, r) => num(Math.round(efficiency(r))) },
                    { key: 'ca_ttc', label: 'CA TTC', width: '110px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'mpaf_ht_pct', label: 'Marge %', width: '75px', align: 'right', render: v => v + '%' },
                    { key: 'freq', label: 'Fréq.', width: '60px', align: 'right' },
                  ]} rows={stats.topEff.map((r, i) => ({ ...r, '#': i + 1 }))}/>
                </Section>
              </div>
            )}

            {activeTab === 'stars' && (
              <Section title="Produits star" subtitle="CA > 300€ ET marge > 20%">
                <MiniTable columns={[
                  { key: '#', label: '#', width: '30px', align: 'right' },
                  { key: 'designation', label: 'Produit' },
                  { key: 'ca_ttc', label: 'CA TTC', width: '110px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'mpaf_ht_pct', label: 'Marge %', width: '70px', align: 'right', render: v => v + '%' },
                  { key: 'mpaf', label: 'MPAF €', width: '100px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'freq', label: 'Fréq.', width: '55px', align: 'right' },
                ]} rows={stats.stars.map((r, i) => ({ ...r, '#': i + 1 }))}/>
              </Section>
            )}

            {activeTab === 'risky' && (
              <Section title="Produits à risque" subtitle="Trie par pertinence économique la plus faible">
                <MiniTable columns={[
                  { key: '#', label: '#', width: '30px', align: 'right' },
                  { key: 'designation', label: 'Produit' },
                  { key: 'ca_ttc', label: 'CA TTC', width: '100px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'uvc', label: 'UVC', width: '55px', align: 'right' },
                  { key: 'mpaf_ht_pct', label: 'Marge %', width: '70px', align: 'right', render: v => v + '%' },
                  { key: 'mpaf', label: 'MPAF €', width: '90px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'panier', label: 'Panier', width: '65px', align: 'right', mono: true, render: v => money(v) },
                ]} rows={stats.risky.map((r, i) => ({ ...r, '#': i + 1 }))}/>
              </Section>
            )}

            {activeTab === 'casse' && (
              <Section title="Casse" subtitle="Pertes enregistrées sur la période">
                <MiniTable columns={[
                  { key: '#', label: '#', width: '30px', align: 'right' },
                  { key: 'designation', label: 'Produit' },
                  { key: 'casse_paf', label: 'Pertes €', width: '100px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'casse_uvc', label: 'Unités', width: '60px', align: 'right' },
                  { key: 'ca_ttc', label: 'CA TTC', width: '100px', align: 'right', mono: true, render: v => money(v) },
                ]} rows={stats.casse.map((r, i) => ({ ...r, '#': i + 1 }))}/>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Analyse;
