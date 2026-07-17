import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '../icons';
import { saveAnalysis, listAnalyses, getAnalysis } from '../lib/analyses';
import { money, num } from '../lib/format';
import { useIsDesktop } from '../hooks/useIsDesktop';

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

function copyEan(ean, e) {
  e.stopPropagation();
  navigator.clipboard?.writeText(ean).catch(function(){});
}

function EanRender(v, row) {
  return React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, maxWidth: '100%' } },
    React.createElement('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--steel)' } }, v),
    React.createElement('button', {
      onClick: function(e) { copyEan(v, e); },
      style: { flexShrink: 0, width: 18, height: 18, borderRadius: 3, border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--stone)', opacity: 0.5, padding: 0 },
      onMouseEnter: function(e) { e.currentTarget.style.opacity = '1'; },
      onMouseLeave: function(e) { e.currentTarget.style.opacity = '0.5'; },
      title: 'Copier EAN'
    },
    React.createElement(Icon.Copy, { s: 9 })
    )
  );
}

var eanCol = { key: 'ean', label: 'EAN', width: '115px', mono: true, render: EanRender };

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

function MiniTable({ rows, columns, compact, onRowClick }) {
  const colWidth = {};
  columns.forEach(c => { colWidth[c.key] = c.width || 'auto'; });
  const gridCols = columns.map(c => colWidth[c.key] || 'auto').join(' ');
  const hoverBg = 'var(--tint-lavender)';
  return (
    <div style={{ fontSize: compact ? 12 : 13, overflowX: 'auto' }}>
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
              onClick={onRowClick ? function() { onRowClick(row); } : undefined}
              onMouseEnter={function(e) { e.currentTarget.style.background = hoverBg; }}
              onMouseLeave={function(e) { e.currentTarget.style.background = leaveBg; }}
              style={{
                display: 'grid', gridTemplateColumns: gridCols,
                gap: compact ? 6 : 10, alignItems: 'center',
                padding: '0 12px', height: compact ? 32 : 38,
                borderBottom: '0.5px solid var(--hairline-soft)',
                transition: 'background 0.07s',
                background: bg,
                cursor: onRowClick ? 'pointer' : 'default',
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

export function Analyse({ onSelectEan } = {}) {
  const isDesktop = useIsDesktop();
  const rowClick = onSelectEan ? (row => onSelectEan(row.ean)) : undefined;
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fileName, setFileName] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [saving, setSaving] = useState(false);
  const [savedId, setSavedId] = useState(null);
  const [saveError, setSaveError] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Load analysis history on mount, then auto-load the most recent one
  useEffect(() => {
    (async () => {
      setHistoryLoading(true);
      try {
        const h = await listAnalyses();
        setHistory(h);
        if (h.length > 0) handleLoadAnalysis(h[0]);
      } catch {}
      setHistoryLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = useCallback(async () => {
    if (!stats) return;
    setSaving(true);
    setSaveError(null);
    try {
      const id = await saveAnalysis(fileName || 'Analyse', stats);
      setSavedId(id);
      setHistory(prev => [{
        id, created_at: new Date().toISOString(),
        file_name: fileName || 'Analyse',
        total_ca: stats.total,
        total_mpaf: stats.totalMpaf,
        product_count: stats.rows,
      }, ...prev]);
    } catch (e) {
      if (e.message === 'TABLE_MISSING') {
        setSaveError('Table analyses introuvable. Va dans Supabase Dashboard > SQL Editor et crée-la (le SQL est dans la console).');
      } else {
        setSaveError(e.message || 'Erreur de sauvegarde');
      }
    }
    setSaving(false);
  }, [stats, fileName]);

  const handleLoadAnalysis = useCallback(async (analysis) => {
    setLoading(true);
    try {
      const full = await getAnalysis(analysis.id);
      if (!full || !full.stats) {
        setError('Impossible de charger cette analyse');
        setLoading(false);
        return;
      }
      const s = full.stats;
      setStats(s);
      setFileName(full.file_name);
      setSavedId(analysis.id);
      setShowHistory(false);
      setActiveTab('overview');
    } catch (e) {
      setError('Erreur de chargement : ' + e.message);
    }
    setLoading(false);
  }, []);

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
      flex: isDesktop ? 1 : 'none', display: 'flex', flexDirection: 'column',
      overflow: isDesktop ? 'hidden' : 'visible',
      minHeight: isDesktop ? 'auto' : '100vh',
      background: 'var(--surface)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '10px 18px', flexShrink: 0,
        borderBottom: '0.5px solid var(--hairline)',
        background: 'var(--canvas)',
        position: isDesktop ? 'relative' : 'sticky',
        top: isDesktop ? 'auto' : 48, zIndex: 10,
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
          <>
            {savedId ? (
              <span style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon.Check s={11} c="var(--success)"/> Sauvegardée
              </span>
            ) : (
              <button onClick={handleSave} disabled={saving} className="btn" style={{ height: 28, fontSize: 12 }}>
                {saving ? <Icon.Spinner s={12} c="var(--charcoal)"/> : <Icon.Catalog s={12}/>}
                {saving ? 'Sauvegarde...' : 'Sauvegarder'}
              </button>
            )}
            <button onClick={handleReset} className="btn btn-ghost" style={{ height: 28, fontSize: 12 }}>
              <Icon.Close s={12}/> Nouveau fichier
            </button>
          </>
        )}
        {saveError && (
          <div style={{ position: 'absolute', top: 48, right: 18, background: 'var(--tint-rose)', padding: '8px 12px', borderRadius: 8, fontSize: 12, color: 'var(--error)', boxShadow: 'var(--sh-2)', zIndex: 10 }}>
            {saveError}
          </div>
        )}
      </div>

      <div style={{ flex: 1, overflowY: isDesktop ? 'auto' : 'visible', padding: isDesktop ? 20 : 16 }}>
        {!stats && !loading && !error && (
          <div style={{ maxWidth: isDesktop ? 480 : 420, margin: '40px auto' }}>
            {showHistory ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <button onClick={function() { setShowHistory(false); }} className="btn btn-ghost" style={{ height: 28, padding: '0 8px', fontSize: 12 }}>
                    <Icon.Close s={12}/> Retour
                  </button>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Analyses sauvegardées</div>
                  <div style={{ flex: 1 }}/>
                  {historyLoading && <Icon.Spinner s={14} c="var(--stone)"/>}
                </div>
                {history.length === 0 && !historyLoading && (
                  <div style={{ textAlign: 'center', padding: 40, color: 'var(--steel)', fontSize: 13 }}>
                    Aucune analyse sauvegardée pour l'instant.
                  </div>
                )}
                {history.map(entry => (
                  <div key={entry.id}
                    onClick={function() { handleLoadAnalysis(entry); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '10px 12px', borderRadius: 8,
                      border: '0.5px solid var(--hairline)',
                      background: 'var(--canvas)', cursor: 'pointer',
                      marginBottom: 6,
                      transition: 'box-shadow 0.1s',
                    }}
                    onMouseEnter={function(e) { e.currentTarget.style.boxShadow = 'var(--sh-1)'; }}
                    onMouseLeave={function(e) { e.currentTarget.style.boxShadow = 'none'; }}
                  >
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: 'var(--tint-lavender)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon.Catalog s={14} c="var(--primary)"/>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {entry.file_name || 'Analyse'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--steel)', marginTop: 1 }}>
                        {new Date(entry.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        {' · ' + money(entry.total_ca) + ' CA · ' + entry.product_count + ' réf.'}
                      </div>
                    </div>
                    <Icon.ChevronRight s={13} c="var(--stone)"/>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <EmptyState onFile={handleFile}/>
                <div style={{ textAlign: 'center', marginTop: 12 }}>
                  <button onClick={function() { setShowHistory(true); }} className="btn btn-ghost" style={{ height: 28, fontSize: 12 }}>
                    <Icon.Calendar s={12}/> Analyses sauvegardées ({history.length})
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {loading && <LoadingState message="Analyse en cours..."/>}

        {error && (
          <div style={{ maxWidth: isDesktop ? 480 : 420, margin: '40px auto', textAlign: 'center' }}>
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
                    eanCol,
                    { key: 'ca_ttc', label: 'CA TTC', width: '100px', align: 'right', mono: true, render: v => money(v) },
                      { key: 'mpaf_ht_pct', label: 'Marge', width: '70px', align: 'right', render: v => v + '%' },
                      { key: 'freq', label: 'Fréq.', width: '55px', align: 'right' },
                    ]} rows={stats.stars.map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
                  </Section>
                )}

                {stats.risky.length > 0 && (
                  <Section title="Produits à risque" subtitle="Faible rotation + faible marge" icon={<Icon.Warn s={14} c="var(--error)"/>} accent="rose">
                    <MiniTable compact columns={[
                      { key: '#', label: '#', width: '24px', align: 'right' },
                      { key: 'designation', label: 'Produit' },
                      eanCol,
                      { key: 'ca_ttc', label: 'CA TTC', width: '90px', align: 'right', mono: true, render: v => money(v) },
                      { key: 'uvc', label: 'UVC', width: '55px', align: 'right' },
                      { key: 'mpaf_ht_pct', label: 'Marge', width: '65px', align: 'right', render: v => v + '%' },
                    ]} rows={stats.risky.slice(0, 10).map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
                  </Section>
                )}

                {stats.casse.length > 0 && (
                  <Section title="Casse" subtitle={stats.casse.length + ' produits avec pertes'} icon={<Icon.Warn s={14} c="var(--warning)"/>} accent="peach">
                    <MiniTable compact columns={[
                      { key: '#', label: '#', width: '24px', align: 'right' },
                      { key: 'designation', label: 'Produit' },
                    eanCol,
                      { key: 'casse_paf', label: 'Pertes €', width: '90px', align: 'right', mono: true, render: v => money(v) },
                      { key: 'casse_uvc', label: 'U.', width: '40px', align: 'right' },
                      { key: 'ca_ttc', label: 'CA TTC', width: '90px', align: 'right', mono: true, render: v => money(v) },
                    ]} rows={stats.casse.map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
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
                    eanCol,
                    { key: 'ca_ttc', label: 'CA TTC', width: '110px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'mpaf_ht_pct', label: 'Marge %', width: '75px', align: 'right', render: v => v + '%' },
                    { key: 'mpaf', label: 'MPAF €', width: '100px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'uvc', label: 'UVC', width: '60px', align: 'right' },
                    { key: 'freq', label: 'Fréq.', width: '60px', align: 'right' },
                  ]} rows={stats.topCa.map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
                </Section>
                <Section title="Meilleures marges (MPAF €)" icon={<Icon.Catalog s={14}/>}>
                  <MiniTable columns={[
                    { key: '#', label: '#', width: '30px', align: 'right' },
                    { key: 'designation', label: 'Produit' },
                    eanCol,
                    { key: 'mpaf', label: 'MPAF €', width: '110px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'mpaf_ht_pct', label: 'Marge %', width: '75px', align: 'right', render: v => v + '%' },
                    { key: 'ca_ttc', label: 'CA TTC', width: '110px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'uvc', label: 'UVC', width: '60px', align: 'right' },
                  ]} rows={stats.topMpaf.map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
                </Section>
                <Section title="Meilleur rapport CA x marge x fréquence" icon={<Icon.Catalog s={14}/>}>
                  <MiniTable columns={[
                    { key: '#', label: '#', width: '30px', align: 'right' },
                    { key: 'designation', label: 'Produit' },
                    eanCol,
                    { key: '_score', label: 'Score', width: '100px', align: 'right', mono: true, render: (_, r) => num(Math.round(efficiency(r))) },
                    { key: 'ca_ttc', label: 'CA TTC', width: '110px', align: 'right', mono: true, render: v => money(v) },
                    { key: 'mpaf_ht_pct', label: 'Marge %', width: '75px', align: 'right', render: v => v + '%' },
                    { key: 'freq', label: 'Fréq.', width: '60px', align: 'right' },
                  ]} rows={stats.topEff.map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
                </Section>
              </div>
            )}

            {activeTab === 'stars' && (
              <Section title="Produits star" subtitle="CA > 300€ ET marge > 20%">
                <MiniTable columns={[
                  { key: '#', label: '#', width: '30px', align: 'right' },
                  { key: 'designation', label: 'Produit' },
                  eanCol,
                  { key: 'ca_ttc', label: 'CA TTC', width: '110px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'mpaf_ht_pct', label: 'Marge %', width: '70px', align: 'right', render: v => v + '%' },
                  { key: 'mpaf', label: 'MPAF €', width: '100px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'freq', label: 'Fréq.', width: '55px', align: 'right' },
                ]} rows={stats.stars.map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
              </Section>
            )}

            {activeTab === 'risky' && (
              <Section title="Produits à risque" subtitle="Trie par pertinence économique la plus faible">
                <MiniTable columns={[
                  { key: '#', label: '#', width: '30px', align: 'right' },
                  { key: 'designation', label: 'Produit' },
                  eanCol,
                  { key: 'ca_ttc', label: 'CA TTC', width: '100px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'uvc', label: 'UVC', width: '55px', align: 'right' },
                  { key: 'mpaf_ht_pct', label: 'Marge %', width: '70px', align: 'right', render: v => v + '%' },
                  { key: 'mpaf', label: 'MPAF €', width: '90px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'panier', label: 'Panier', width: '65px', align: 'right', mono: true, render: v => money(v) },
                ]} rows={stats.risky.map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
              </Section>
            )}

            {activeTab === 'casse' && (
              <Section title="Casse" subtitle="Pertes enregistrées sur la période">
                <MiniTable columns={[
                  { key: '#', label: '#', width: '30px', align: 'right' },
                  { key: 'designation', label: 'Produit' },
                  eanCol,
                  { key: 'casse_paf', label: 'Pertes €', width: '100px', align: 'right', mono: true, render: v => money(v) },
                  { key: 'casse_uvc', label: 'Unités', width: '60px', align: 'right' },
                  { key: 'ca_ttc', label: 'CA TTC', width: '100px', align: 'right', mono: true, render: v => money(v) },
                ]} rows={stats.casse.map((r, i) => ({ ...r, '#': i + 1 }))} onRowClick={rowClick}/>
              </Section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default Analyse;
