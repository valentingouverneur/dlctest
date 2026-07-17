import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '../icons';
import { saveAnalysis, listAnalyses, getAnalysis, getPreviousAnalysis } from '../lib/analyses';
import { parseInfomilCsv, deriveWeek, buildLabel, titleCase, COLUMN_LABELS } from '../lib/infomil';
import { computeStats, inferColumns, efficiency } from '../lib/analyseStats';
import { money, num } from '../lib/format';
import { useIsDesktop } from '../hooks/useIsDesktop';
import { KpiTile } from '../components/charts/KpiTile';
import { Sparkline } from '../components/charts/Sparkline';
import { ScatterQuadrant } from '../components/charts/ScatterQuadrant';
import { ParetoCurve } from '../components/charts/ParetoCurve';
import { DeltaBars } from '../components/charts/DeltaBars';

// Chronological series of saved weeks for the current rayon (max 8),
// including the current unsaved import as a virtual last point.
function rayonSeries(history, current) {
  if (!current || !current.rayon) return [];
  const rows = history
    .filter(h => h.rayon === current.rayon && h.period_date)
    .map(h => ({
      week: h.week_label, date: h.period_date,
      ca: h.total_ca ?? null, mpaf: h.total_mpaf ?? null,
      uvc: h.total_uvc ?? null, casse: h.total_casse ?? null,
    }));
  if (current.periodDate && !rows.some(r => r.week === current.weekLabel)) {
    rows.push({
      week: current.weekLabel, date: current.periodDate,
      ca: current.stats.total, mpaf: current.stats.totalMpaf,
      uvc: current.stats.totalUvc, casse: current.stats.totalCasse ?? null,
    });
  }
  rows.sort((a, b) => (a.date < b.date ? -1 : 1));
  return rows.slice(-8);
}

function deltaOf(series, key, currentWeek) {
  const i = series.findIndex(r => r.week === currentWeek);
  if (i < 1) return null;
  const cur = series[i][key], prev = series[i - 1][key];
  if (cur == null || prev == null || prev === 0) return null;
  return (cur - prev) / prev;
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
        Export brut <strong>Infomil — Statistiques sur une période</strong>, aucune retouche nécessaire
      </div>
    </div>
  );
}

function ImportReport({ report, onClose }) {
  const warn = report.missingLabels.length > 0 || !report.integrity.ok;
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10,
      padding: '10px 14px', borderRadius: 8, marginBottom: 14,
      background: warn ? 'var(--tint-peach)' : 'var(--tint-mint)',
      border: '0.5px solid var(--hairline)', fontSize: 12, color: 'var(--charcoal)',
    }}>
      <div style={{ flex: 1 }}>
        <strong>{num(report.count)} références importées.</strong>
        {' '}
        {report.integrity.ok
          ? '✓ Totaux conformes au fichier.'
          : '⚠ Écart avec les totaux du fichier : '
            + Object.entries(report.integrity.deltas)
                .map(([k, d]) => k + ' calculé ' + d.computed + ' vs ' + d.official)
                .join(' · ') + '.'}
        {report.missingLabels.length > 0 && (
          <div style={{ marginTop: 3, color: 'var(--steel)' }}>
            Colonnes absentes de cet export : {report.missingLabels.join(', ')} — les sections liées sont masquées.
          </div>
        )}
      </div>
      <button onClick={onClose} className="btn btn-ghost" style={{ height: 22, width: 22, padding: 0, flexShrink: 0 }}>
        <Icon.Close s={11}/>
      </button>
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
  const [current, setCurrent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [saveState, setSaveState] = useState(null); // null | 'saving' | 'saved' | 'error'
  const [saveError, setSaveError] = useState(null);
  const [report, setReport] = useState(null);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);

  const stats = current?.stats;
  const has = useCallback(
    key => !current?.columns || current.columns.found.includes(key),
    [current]
  );
  const series = rayonSeries(history, current);
  const trends = key => (series.length >= 2 ? series.map(r => r[key]) : null);
  const margeSeries = series.map(r => (r.ca ? (r.mpaf || 0) / r.ca * 100 : null));
  const eanClick = onSelectEan || undefined; // for charts that pass a bare EAN

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

  const [compare, setCompare] = useState(null); // null | 'loading' | 'none' | { … }

  useEffect(() => {
    if (activeTab !== 'compare' || !current) return;
    if (!current.rows || !current.rayon || !current.periodDate) { setCompare('none'); return; }
    let cancelled = false;
    setCompare('loading');
    (async () => {
      const prev = await getPreviousAnalysis(current.rayon, current.periodDate);
      if (cancelled) return;
      if (!prev || !Array.isArray(prev.rows) || prev.rows.length === 0) { setCompare('none'); return; }
      const prevBy = new Map(prev.rows.map(r => [r.ean, r]));
      const curBy = new Map(current.rows.map(r => [r.ean, r]));
      const deltas = [];
      for (const r of current.rows) {
        const p = prevBy.get(r.ean);
        if (p) deltas.push({ ean: r.ean, designation: r.designation, delta: (r.ca_ttc || 0) - (p.ca_ttc || 0) });
      }
      const gainers = deltas.filter(d => d.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 10);
      const losers = deltas.filter(d => d.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 10);
      const appeared = current.rows.filter(r => !prevBy.has(r.ean))
        .sort((a, b) => (b.ca_ttc || 0) - (a.ca_ttc || 0)).slice(0, 15);
      const disappeared = prev.rows.filter(r => !curBy.has(r.ean))
        .sort((a, b) => (b.ca_ttc || 0) - (a.ca_ttc || 0)).slice(0, 15);
      setCompare({ prevLabel: prev.file_name || prev.week_label || 'semaine précédente', gainers, losers, appeared, disappeared });
    })().catch(() => { if (!cancelled) setCompare('none'); });
    return () => { cancelled = true; };
  }, [activeTab, current]);

  const refreshHistory = useCallback(async () => {
    try { setHistory(await listAnalyses()); } catch {}
  }, []);

  const persist = useCallback(async (cur) => {
    setSaveState('saving');
    setSaveError(null);
    try {
      const id = await saveAnalysis({
        fileName: cur.fileName, label: cur.label,
        rayon: cur.rayon, rayonCode: cur.rayonCode,
        weekLabel: cur.weekLabel, periodDate: cur.periodDate,
        stats: cur.stats, rows: cur.rows,
      });
      setCurrent(c => (c && c.label === cur.label ? { ...c, id } : c));
      setSaveState('saved');
      refreshHistory();
    } catch (e) {
      setSaveState('error');
      if (e.message === 'TABLE_MISSING' || e.message === 'MIGRATION_MISSING') {
        setSaveError('Base non à jour : exécute supabase/2026-07-16-analyses-v2.sql dans Supabase Dashboard > SQL Editor.');
      } else {
        setSaveError(e.message || 'Erreur de sauvegarde');
      }
    }
  }, [refreshHistory]);

  const handleFile = useCallback(async (file) => {
    setLoading(true);
    setError(null);
    setCompare(null);
    try {
      const text = await file.text();
      const parsed = parseInfomilCsv(text);
      if (parsed.error) { setError(parsed.error); setLoading(false); return; }

      const stats = computeStats(parsed.rows);
      const week = deriveWeek(file.name, parsed.meta);
      const label = buildLabel(week, parsed.meta, file.name);
      const cur = {
        id: null, label, fileName: file.name,
        rayon: parsed.meta.rayon, rayonCode: parsed.meta.rayonCode,
        weekLabel: week ? week.key : null,
        periodDate: parsed.meta.exportedAt
          ? parsed.meta.exportedAt.getFullYear() + '-'
            + String(parsed.meta.exportedAt.getMonth() + 1).padStart(2, '0') + '-'
            + String(parsed.meta.exportedAt.getDate()).padStart(2, '0')
          : null,
        stats, rows: parsed.rows, columns: parsed.columns, integrity: parsed.integrity,
        legacy: false,
      };
      setCurrent(cur);
      setReport({
        count: parsed.rows.length,
        missingLabels: parsed.columns.missing.map(k => COLUMN_LABELS[k]),
        integrity: parsed.integrity,
      });
      setActiveTab('overview');
      setLoading(false);
      persist(cur);
    } catch (e) {
      setError('Erreur de lecture : ' + e.message);
      setLoading(false);
    }
  }, [persist]);

  const handleLoadAnalysis = useCallback(async (entry) => {
    setLoading(true);
    setError(null);
    setReport(null);
    setCompare(null);
    try {
      const full = await getAnalysis(entry.id);
      if (!full || (!full.stats && !full.rows)) {
        setError('Impossible de charger cette analyse');
        setLoading(false);
        return;
      }
      const hasRows = Array.isArray(full.rows) && full.rows.length > 0;
      const stats = hasRows ? computeStats(full.rows) : full.stats;
      setCurrent({
        id: full.id, label: full.file_name || 'Analyse', fileName: full.file_name,
        rayon: full.rayon || null, rayonCode: full.rayon_code || null,
        weekLabel: full.week_label || null, periodDate: full.period_date || null,
        stats, rows: hasRows ? full.rows : null,
        columns: hasRows ? inferColumns(full.rows) : null,
        integrity: null, legacy: !hasRows,
      });
      setSaveState('saved');
      setSaveError(null);
      setShowHistory(false);
      setActiveTab('overview');
    } catch (e) {
      setError('Erreur de chargement : ' + e.message);
    }
    setLoading(false);
  }, []);

  const handleReset = () => {
    setCurrent(null);
    setError(null);
    setReport(null);
    setSaveState(null);
    setSaveError(null);
    setCompare(null);
  };

  const tabs = [
    { key: 'overview', label: 'Vue d\'ensemble' },
    { key: 'compare', label: 'Comparaison' },
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
        {history.length > 0 && (
          <select
            value={current?.id || ''}
            onChange={e => {
              const entry = history.find(h => h.id === e.target.value);
              if (entry) handleLoadAnalysis(entry);
            }}
            className="input"
            style={{ height: 28, fontSize: 12, width: 'auto', minWidth: 150, padding: '0 8px' }}
          >
            {!current?.id && <option value="">Import en cours…</option>}
            {history.map(h => (
              <option key={h.id} value={h.id}>
                {(h.week_label ? h.week_label.slice(5) + (h.rayon ? ' · ' + titleCase(h.rayon) : '') : h.file_name || 'Analyse')
                  + ' — ' + new Date(h.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
              </option>
            ))}
          </select>
        )}
        {current && (
          <>
            {saveState === 'saving' && (
              <span style={{ fontSize: 11, color: 'var(--steel)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon.Spinner s={11} c="var(--steel)"/> Sauvegarde…
              </span>
            )}
            {saveState === 'saved' && (
              <span style={{ fontSize: 11, color: 'var(--success)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Icon.Check s={11} c="var(--success)"/> {current.label} enregistrée
              </span>
            )}
            {saveState === 'error' && (
              <button onClick={() => persist(current)} className="btn" style={{ height: 28, fontSize: 12, color: 'var(--error)' }}>
                <Icon.Warn s={12} c="var(--error)"/> Non sauvegardée — réessayer
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
                        {(entry.week_label ? entry.week_label.slice(5) + (entry.rayon ? ' · ' + titleCase(entry.rayon) : '') : entry.file_name || 'Analyse')}
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
            {report && <ImportReport report={report} onClose={() => setReport(null)}/>}
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
                {current.label}
              </div>
            </div>

            {activeTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <KpiTile label="CA Total TTC" value={money(stats.total)}
                    sub={(stats.count ?? stats.rows) + ' réfs'}
                    delta={deltaOf(series, 'ca', current.weekLabel)} trend={trends('ca')}/>
                  <KpiTile label="Marge (MPAF)" value={money(stats.totalMpaf)}
                    delta={deltaOf(series, 'mpaf', current.weekLabel)} trend={trends('mpaf')}/>
                  <KpiTile label="Taux de marge" value={(stats.total > 0 ? (stats.totalMpaf / stats.total * 100).toFixed(1) : '—') + ' %'}
                    trend={series.length >= 2 ? margeSeries : null}/>
                  <KpiTile label="Unités vendues" value={num(stats.totalUvc)}
                    sub={stats.totalUvc > 0 ? (stats.total / stats.totalUvc).toFixed(2) + ' €/u' : ''}
                    delta={deltaOf(series, 'uvc', current.weekLabel)} trend={trends('uvc')}/>
                  {has('casse_paf') && (
                    <KpiTile label="Casse" value={money(stats.totalCasse)}
                      delta={deltaOf(series, 'casse', current.weekLabel)} upIsGood={false} trend={trends('casse')}/>
                  )}
                </div>

                {current.rows ? (
                  <>
                    {has('mpaf_ht_pct') && (
                      <Section title="Portefeuille CA × marge" subtitle="Chaque point est une référence — clique pour ouvrir la fiche" icon={<Icon.BarChart s={14}/>}>
                        <ScatterQuadrant rows={current.rows} onSelectEan={eanClick}/>
                      </Section>
                    )}
                    <Section title="Concentration du CA" subtitle="Références classées par CA décroissant" icon={<Icon.BarChart s={14}/>}>
                      <ParetoCurve rows={current.rows}/>
                    </Section>
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--steel)', padding: '4px 2px' }}>
                    Analyse enregistrée avant la v2 — graphiques indisponibles. Réimporte le fichier CSV pour les activer.
                  </div>
                )}

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

                {has('casse_paf') && stats.casse.length > 0 && (
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

            {activeTab === 'compare' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {compare === 'loading' && <LoadingState message="Comparaison en cours…"/>}
                {compare === 'none' && (
                  <div style={{ textAlign: 'center', padding: 48, color: 'var(--steel)', fontSize: 13, lineHeight: 1.6 }}>
                    Pas de semaine précédente comparable pour ce rayon.<br/>
                    Importe les exports chaque semaine : la comparaison apparaîtra automatiquement.
                  </div>
                )}
                {compare && typeof compare === 'object' && (
                  <>
                    <Section title={'Évolution du CA vs ' + compare.prevLabel} subtitle="Plus fortes hausses et baisses par référence" icon={<Icon.BarChart s={14}/>}>
                      <DeltaBars items={[...compare.gainers, ...compare.losers]} onSelectEan={eanClick}/>
                    </Section>
                    {compare.appeared.length > 0 && (
                      <Section title="Nouvelles références" subtitle={compare.appeared.length + ' réfs absentes de ' + compare.prevLabel} icon={<Icon.Check s={14} c="var(--success)"/>} accent="mint">
                        <MiniTable compact columns={[
                          { key: 'designation', label: 'Produit' },
                          eanCol,
                          { key: 'ca_ttc', label: 'CA TTC', width: '100px', align: 'right', mono: true, render: v => money(v) },
                          { key: 'uvc', label: 'UVC', width: '55px', align: 'right' },
                        ]} rows={compare.appeared} onRowClick={rowClick}/>
                      </Section>
                    )}
                    {compare.disappeared.length > 0 && (
                      <Section title="Références disparues" subtitle={'Présentes dans ' + compare.prevLabel + ', absentes cette semaine'} icon={<Icon.Close s={14} c="var(--stone)"/>}>
                        <MiniTable compact columns={[
                          { key: 'designation', label: 'Produit' },
                          eanCol,
                          { key: 'ca_ttc', label: 'CA TTC préc.', width: '110px', align: 'right', mono: true, render: v => money(v) },
                        ]} rows={compare.disappeared} onRowClick={rowClick}/>
                      </Section>
                    )}
                  </>
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
                {has('freq') && (
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
                )}
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
