import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from '../icons';
import {
  listWorkDays, upsertWorkDay, deleteWorkDay,
  parseHM, segMinutes, dayMinutes, fmtHM, fmtDelta,
  toDayKey, fromDayKey, addDays, mondayOf, isoWeekOf, groupWeeks,
  getTemplate, saveTemplate, getContractHours, saveContractHours,
} from '../lib/workDays';
import { useIsDesktop } from '../hooks/useIsDesktop';

const DAY_LETTERS = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const DAY_NAMES = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
// Bar chart: light + dark step of the app's primary hue; identity is also
// carried by position (base below / dépassement above the 39h line).
const BAR_BASE = '#beb2ec';
const BAR_OVER = 'var(--primary)';

const card = {
  background: 'var(--canvas)', border: '0.5px solid var(--hairline)',
  borderRadius: 12, padding: 14, marginBottom: 12,
};

function fmtDateLabel(dayKey) {
  const d = fromDayKey(dayKey);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function fmtDateShort(dayKey) {
  return fromDayKey(dayKey).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function TimeInput({ value, onChange }) {
  return (
    <input
      type="time"
      value={value || ''}
      onChange={e => onChange(e.target.value)}
      className="focus-ring"
      style={{
        height: 36, padding: '0 8px', borderRadius: 8,
        border: '0.5px solid var(--hairline-strong)', background: 'var(--canvas)',
        fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--ink)',
        width: 92,
      }}
    />
  );
}

export function Heures() {
  const today = toDayKey(new Date());
  const isDesktop = useIsDesktop();

  const [rows, setRows] = useState({});          // dayKey → work_day row
  const [loading, setLoading] = useState(true);
  const [tableMissing, setTableMissing] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const [editDate, setEditDate] = useState(today);
  const [draft, setDraft] = useState({ segments: [], note: '', off: false });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [savedFlash, setSavedFlash] = useState(false);

  const [contract, setContract] = useState(getContractHours);
  const [template, setTemplate] = useState(getTemplate);
  const [showSettings, setShowSettings] = useState(false);
  const [selWeek, setSelWeek] = useState(null);  // monday key of selected bar

  const contractMin = contract * 60;

  // ── Load ──
  useEffect(() => {
    let cancelled = false;
    listWorkDays()
      .then(data => {
        if (cancelled) return;
        setRows(Object.fromEntries(data.map(r => [r.day, r])));
        setLoading(false);
      })
      .catch(e => {
        if (cancelled) return;
        if (e.message === 'TABLE_MISSING') setTableMissing(true);
        else setLoadError(e.message);
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  // ── Draft init: saved entry, else journée type ──
  useEffect(() => {
    const saved = rows[editDate];
    if (saved) {
      setDraft({
        segments: (saved.segments || []).map(s => ({ ...s })),
        note: saved.note || '',
        off: (saved.segments || []).length === 0,
      });
    } else {
      const tpl = template[fromDayKey(editDate).getDay()] || [];
      setDraft({ segments: tpl.map(s => ({ ...s })), note: '', off: tpl.length === 0 });
    }
    setSaveError(null);
    setSavedFlash(false);
    // Re-init when the date changes or when data arrives; keep user edits otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editDate, loading]);

  // ── Derived stats ──
  const weeks = useMemo(() => groupWeeks(Object.values(rows)), [rows]);
  const currentMonday = mondayOf(today);
  const thisWeek = weeks.find(w => w.monday === currentMonday);
  const completeWeeks = weeks.filter(w => w.monday !== currentMonday);
  const avgMin = completeWeeks.length
    ? completeWeeks.reduce((s, w) => s + w.minutes, 0) / completeWeeks.length
    : null;
  const cumulMin = completeWeeks.reduce((s, w) => s + (w.minutes - contractMin), 0);

  // ── Draft editing ──
  const validSegs = draft.off ? [] : draft.segments.filter(s => parseHM(s.start) !== null && parseHM(s.end) !== null);
  const draftMin = dayMinutes(validSegs);
  const canSave = !saving && (draft.off || draftMin > 0);
  const alreadySaved = !!rows[editDate];

  const setSeg = (i, field, val) => setDraft(d => ({
    ...d,
    segments: d.segments.map((s, j) => j === i ? { ...s, [field]: val } : s),
  }));
  const addSeg = () => setDraft(d => ({ ...d, segments: [...d.segments, { start: '', end: '' }] }));
  const rmSeg = (i) => setDraft(d => ({ ...d, segments: d.segments.filter((_, j) => j !== i) }));
  const toggleOff = () => setDraft(d => {
    if (d.off) {
      const tpl = template[fromDayKey(editDate).getDay()] || [];
      const segs = d.segments.length ? d.segments : (tpl.length ? tpl.map(s => ({ ...s })) : [{ start: '', end: '' }]);
      return { ...d, off: false, segments: segs };
    }
    return { ...d, off: true };
  });

  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const saved = await upsertWorkDay(editDate, validSegs, draft.note);
      setRows(prev => ({ ...prev, [editDate]: saved }));
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1800);
    } catch (e) {
      if (e.message === 'TABLE_MISSING') setTableMissing(true);
      else setSaveError(e.message);
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!window.confirm('Supprimer la saisie du ' + fmtDateShort(editDate) + ' ?')) return;
    try {
      await deleteWorkDay(editDate);
      setRows(prev => {
        const next = { ...prev };
        delete next[editDate];
        return next;
      });
    } catch (e) {
      setSaveError(e.message);
    }
  };

  // ── Week strip for the edited date ──
  const stripMonday = mondayOf(editDate);
  const stripDays = [...Array(7)].map((_, i) => addDays(stripMonday, i));
  const stripMin = stripDays.reduce((s, k) => s + (rows[k] ? dayMinutes(rows[k].segments) : 0), 0);
  const stripIso = isoWeekOf(stripMonday);

  // ── Settings handlers ──
  const setTplSeg = (weekday, segIdx, field, val) => {
    setTemplate(prev => {
      const segs = [0, 1].map(i => ({ ...(prev[weekday]?.[i] || { start: '', end: '' }) }));
      segs[segIdx][field] = val;
      const cleaned = segs.filter(s => parseHM(s.start) !== null && parseHM(s.end) !== null);
      const next = { ...prev, [weekday]: cleaned };
      saveTemplate(next);
      return next;
    });
  };
  const handleContract = (val) => {
    const h = parseFloat(val);
    if (Number.isFinite(h) && h > 0 && h <= 60) {
      setContract(h);
      saveContractHours(h);
    }
  };

  const chartWeeks = weeks.slice(-16);
  const selected = chartWeeks.find(w => w.monday === selWeek);

  return (
    <div style={{ minHeight: '100%', background: 'var(--surface)' }}>
      <div style={{
        maxWidth: isDesktop ? 'none' : 640,
        margin: isDesktop ? 0 : '0 auto',
        padding: isDesktop ? '20px 24px 48px' : '14px 14px 96px',
        display: isDesktop ? 'grid' : 'block',
        gridTemplateColumns: isDesktop ? '420px 1fr' : 'none',
        gap: isDesktop ? 20 : 0,
        alignItems: 'start',
      }}>

        {(tableMissing || loadError) && (
          <div style={{ gridColumn: isDesktop ? '1 / -1' : 'auto' }}>
            {tableMissing && (
          <div style={{ ...card, background: 'var(--tint-yellow)', border: '0.5px solid var(--tint-yellow-bold)', display: 'flex', gap: 10 }}>
            <Icon.Warn s={16} c="var(--warning)"/>
            <div style={{ fontSize: 12.5, color: 'var(--charcoal)', lineHeight: 1.45 }}>
              <strong>Table manquante.</strong> Exécute la section <span className="mono">work_days</span> de{' '}
              <span className="mono">supabase/schema.sql</span> dans l'éditeur SQL Supabase, puis recharge la page.
            </div>
          </div>
        )}
            {loadError && (
              <div style={{ ...card, background: 'var(--tint-rose)', fontSize: 12.5, color: 'var(--error)' }}>
                Erreur de chargement : {loadError}
              </div>
            )}
          </div>
        )}

        {/* ── Saisie du jour (colonne 1 en desktop) ── */}
        <div style={card}>
          {/* Date nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <button onClick={() => setEditDate(d => addDays(d, -1))} className="btn btn-ghost" style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}>
              <span style={{ display: 'flex', transform: 'rotate(180deg)' }}>
                <Icon.ChevronRight s={14} c="var(--charcoal)"/>
              </span>
            </button>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ fontSize: 14.5, fontWeight: 600, textTransform: 'capitalize' }}>
                {editDate === today ? "Aujourd'hui" : fmtDateLabel(editDate)}
              </div>
              <div style={{ fontSize: 11, color: 'var(--stone)', marginTop: 1 }}>
                {editDate === today ? fmtDateLabel(editDate) : (
                  <button onClick={() => setEditDate(today)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 11, padding: 0, fontFamily: 'inherit' }}>
                    Revenir à aujourd'hui
                  </button>
                )}
              </div>
            </div>
            <button
              onClick={() => setEditDate(d => addDays(d, 1))}
              disabled={editDate >= today}
              className="btn btn-ghost"
              style={{ width: 32, height: 32, padding: 0, justifyContent: 'center', opacity: editDate >= today ? 0.35 : 1 }}
            >
              <Icon.ChevronRight s={14} c="var(--charcoal)"/>
            </button>
          </div>

          {/* Week strip */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {stripDays.map((k, i) => {
              const row = rows[k];
              const min = row ? dayMinutes(row.segments) : 0;
              const isEdit = k === editDate;
              const isFuture = k > today;
              const state = row ? (min > 0 ? 'worked' : 'off') : (isFuture ? 'future' : 'missing');
              return (
                <button key={k} onClick={() => !isFuture && setEditDate(k)}
                  style={{
                    flex: 1, height: 46, borderRadius: 8, cursor: isFuture ? 'default' : 'pointer',
                    border: isEdit ? '1.5px solid var(--primary)' : '0.5px solid var(--hairline)',
                    background: state === 'worked' ? 'var(--tint-lavender)' : 'var(--canvas)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    opacity: isFuture ? 0.4 : 1, padding: 0, fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--stone)' }}>{DAY_LETTERS[i]}</span>
                  <span style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: state === 'worked' ? 'var(--primary-deep)' : 'var(--stone)' }}>
                    {state === 'worked' ? fmtHM(min) : state === 'off' ? '—' : state === 'missing' ? '·' : ''}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 14, fontSize: 12, color: 'var(--steel)' }}>
            <span>Semaine {stripIso.label}</span>
            <div style={{ flex: 1 }}/>
            <span className="mono" style={{ fontWeight: 600, color: 'var(--ink)' }}>{fmtHM(stripMin)}</span>
            <span className="mono" style={{ color: stripMin >= contractMin ? 'var(--primary)' : 'var(--stone)' }}>
              ({fmtDelta(stripMin - contractMin)})
            </span>
          </div>

          {/* Segments editor */}
          {draft.off ? (
            <div style={{
              padding: '18px 0', textAlign: 'center', fontSize: 13, color: 'var(--steel)',
              background: 'var(--surface)', borderRadius: 8, marginBottom: 12,
            }}>
              Jour de repos
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              {draft.segments.map((seg, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TimeInput value={seg.start} onChange={v => setSeg(i, 'start', v)}/>
                  <span style={{ color: 'var(--stone)', fontSize: 13 }}>→</span>
                  <TimeInput value={seg.end} onChange={v => setSeg(i, 'end', v)}/>
                  <span className="mono" style={{ flex: 1, textAlign: 'right', fontSize: 12, color: 'var(--steel)' }}>
                    {segMinutes(seg) > 0 ? fmtHM(segMinutes(seg)) : ''}
                  </span>
                  {draft.segments.length > 1 && (
                    <button onClick={() => rmSeg(i)} className="btn btn-ghost" style={{ width: 28, height: 28, padding: 0, justifyContent: 'center' }}>
                      <Icon.Close s={12} c="var(--stone)"/>
                    </button>
                  )}
                </div>
              ))}
              {draft.segments.length < 3 && (
                <button onClick={addSeg} className="btn btn-ghost" style={{ height: 30, fontSize: 12, alignSelf: 'flex-start' }}>
                  <Icon.Plus s={12}/> Ajouter une plage
                </button>
              )}
            </div>
          )}

          {/* Note */}
          <input
            value={draft.note}
            onChange={e => setDraft(d => ({ ...d, note: e.target.value }))}
            placeholder="Note (livraison, remplacement, inventaire…)"
            className="input"
            style={{ width: '100%', marginBottom: 12, fontSize: 13 }}
          />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={toggleOff}
              className="btn"
              style={{ height: 40, fontSize: 13, ...(draft.off ? { background: 'var(--tint-lavender)', borderColor: 'var(--primary)', color: 'var(--primary-deep)' } : {}) }}
            >
              Repos
            </button>
            <button
              onClick={handleSave}
              disabled={!canSave}
              className="btn btn-primary"
              style={{ flex: 1, height: 40, fontSize: 14, justifyContent: 'center', opacity: canSave ? 1 : 0.5 }}
            >
              {saving ? <Icon.Spinner s={14} c="white"/> : savedFlash ? <Icon.Check s={14} c="white"/> : null}
              {savedFlash
                ? 'Enregistré'
                : draft.off
                  ? (alreadySaved ? 'Mettre à jour · repos' : 'Valider · repos')
                  : (alreadySaved ? 'Mettre à jour · ' : 'Valider · ') + fmtHM(draftMin)}
            </button>
            {alreadySaved && (
              <button onClick={handleDelete} className="btn btn-ghost" style={{ height: 40, fontSize: 12, color: 'var(--error)' }}>
                Suppr.
              </button>
            )}
          </div>
          {saveError && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--error)' }}>{saveError}</div>
          )}
        </div>

        {/* ── Stats + graphique + réglages (colonne 2 en desktop) ── */}
        <div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(96px, 1fr))', gap: 8, marginBottom: 12 }}>
          <div style={{ ...card, marginBottom: 0, padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 6 }}>
              Cette semaine
            </div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {fmtHM(thisWeek?.minutes || 0)}
            </div>
            <div className="mono" style={{ fontSize: 11, marginTop: 2, color: (thisWeek?.minutes || 0) >= contractMin ? 'var(--primary)' : 'var(--stone)' }}>
              {fmtDelta((thisWeek?.minutes || 0) - contractMin)} vs {contract}h
            </div>
          </div>
          <div style={{ ...card, marginBottom: 0, padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 6 }}>
              Moyenne hebdo
            </div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {avgMin === null ? '—' : fmtHM(avgMin)}
            </div>
            <div style={{ fontSize: 11, marginTop: 2, color: 'var(--stone)' }}>
              sur {completeWeeks.length} semaine{completeWeeks.length > 1 ? 's' : ''}
            </div>
          </div>
          <div style={{ ...card, marginBottom: 0, padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--stone)', marginBottom: 6 }}>
              Cumul vs {contract}h
            </div>
            <div className="mono" style={{ fontSize: 19, fontWeight: 600, letterSpacing: '-0.02em', color: cumulMin > 0 ? 'var(--primary)' : 'var(--ink)' }}>
              {completeWeeks.length ? fmtDelta(cumulMin) : '—'}
            </div>
            <div style={{ fontSize: 11, marginTop: 2, color: 'var(--stone)' }}>
              hors sem. en cours
            </div>
          </div>
        </div>

        {/* ── Chart ── */}
        {chartWeeks.length > 0 && (
          <div style={card}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>Heures par semaine</div>
              <div style={{ flex: 1 }}/>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--steel)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2.5, background: BAR_BASE }}/> Jusqu'à {contract}h
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--steel)' }}>
                <span style={{ width: 9, height: 9, borderRadius: 2.5, background: BAR_OVER }}/> Au-delà
              </span>
            </div>
            <WeekChart
              weeks={chartWeeks}
              contractMin={contractMin}
              currentMonday={currentMonday}
              selWeek={selWeek}
              onSelect={m => setSelWeek(s => s === m ? null : m)}
            />
            {selected && (
              <div style={{
                marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--surface)',
                fontSize: 12, color: 'var(--charcoal)', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'baseline',
              }}>
                <strong>{selected.label}</strong>
                <span style={{ color: 'var(--steel)' }}>
                  {fmtDateShort(selected.monday)} – {fmtDateShort(addDays(selected.monday, 6))}
                </span>
                <span className="mono" style={{ fontWeight: 600 }}>{fmtHM(selected.minutes)}</span>
                <span className="mono" style={{ color: selected.minutes >= contractMin ? 'var(--primary)' : 'var(--stone)' }}>
                  ({fmtDelta(selected.minutes - contractMin)})
                </span>
                <span style={{ color: 'var(--steel)' }}>
                  · {Object.keys(selected.days).length} jour{Object.keys(selected.days).length > 1 ? 's' : ''} saisi{Object.keys(selected.days).length > 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Journée type & contrat ── */}
        <div style={{ ...card, padding: 0 }}>
          <button
            onClick={() => setShowSettings(s => !s)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, width: '100%',
              padding: 14, border: 'none', background: 'none', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 13, fontWeight: 600, color: 'var(--ink)', textAlign: 'left',
            }}
          >
            <Icon.Settings s={14} c="var(--stone)"/>
            Journée type & contrat
            <div style={{ flex: 1 }}/>
            <span style={{ transform: showSettings ? 'rotate(180deg)' : 'none', display: 'flex', transition: 'transform 0.15s' }}>
              <Icon.ChevronDown s={13} c="var(--stone)"/>
            </span>
          </button>
          {showSettings && (
            <div style={{ padding: '0 14px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <label style={{ fontSize: 12.5, color: 'var(--charcoal)' }}>Heures contractuelles / semaine</label>
                <input
                  type="number" min="1" max="60" step="0.5"
                  defaultValue={contract}
                  onChange={e => handleContract(e.target.value)}
                  className="input"
                  style={{ width: 70, textAlign: 'center', fontFamily: 'var(--font-mono)' }}
                />
              </div>
              <div style={{ fontSize: 11, color: 'var(--stone)', marginBottom: 10, lineHeight: 1.5 }}>
                La journée type pré-remplit la saisie quotidienne — tu n'ajustes que les écarts.
                Laisse les champs vides pour un jour de repos.
              </div>
              {[1, 2, 3, 4, 5, 6, 0].map(wd => {
                const segs = [0, 1].map(i => template[wd]?.[i] || { start: '', end: '' });
                const tot = dayMinutes(template[wd] || []);
                return (
                  <div key={wd} style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', padding: '5px 0', borderTop: '0.5px solid var(--hairline-soft)' }}>
                    <span style={{ width: 34, fontSize: 11.5, fontWeight: 600, color: 'var(--charcoal)', flexShrink: 0 }}>
                      {DAY_NAMES[(wd + 6) % 7].slice(0, 3)}
                    </span>
                    {segs.map((seg, i) => (
                      <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                        <input type="time" value={seg.start} onChange={e => setTplSeg(wd, i, 'start', e.target.value)}
                          style={{ height: 28, width: 74, padding: '0 4px', borderRadius: 6, border: '0.5px solid var(--hairline)', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--charcoal)' }}/>
                        <span style={{ fontSize: 10, color: 'var(--stone)' }}>–</span>
                        <input type="time" value={seg.end} onChange={e => setTplSeg(wd, i, 'end', e.target.value)}
                          style={{ height: 28, width: 74, padding: '0 4px', borderRadius: 6, border: '0.5px solid var(--hairline)', fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--charcoal)' }}/>
                      </span>
                    ))}
                    <span className="mono" style={{ flex: 1, textAlign: 'right', fontSize: 11, color: tot > 0 ? 'var(--steel)' : 'var(--stone)' }}>
                      {tot > 0 ? fmtHM(tot) : 'repos'}
                    </span>
                  </div>
                );
              })}
              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 8, fontSize: 11.5 }}>
                <span style={{ color: 'var(--steel)' }}>Total journée type :&nbsp;</span>
                <span className="mono" style={{ fontWeight: 600 }}>
                  {fmtHM([0, 1, 2, 3, 4, 5, 6].reduce((s, wd) => s + dayMinutes(template[wd] || []), 0))}
                </span>
              </div>
            </div>
          )}
        </div>

        </div>

        {loading && (
          <div style={{ gridColumn: isDesktop ? '1 / -1' : 'auto', textAlign: 'center', padding: 20 }}>
            <Icon.Spinner s={16} c="var(--stone)"/>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Weekly bar chart (div-based, tap for detail) ────────────────────
function WeekChart({ weeks, contractMin, currentMonday, selWeek, onSelect }) {
  const PLOT_H = 170;
  const maxMin = Math.max(contractMin + 6 * 60, ...weeks.map(w => w.minutes + 60));
  const yMax = Math.ceil(maxMin / 600) * 600; // round up to 10h
  const ticks = [];
  for (let t = 600; t < yMax; t += 600) ticks.push(t);
  const labelEvery = weeks.length > 10 ? 2 : 1;

  const y = min => (min / yMax) * PLOT_H;

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {/* Y labels */}
      <div style={{ position: 'relative', width: 26, height: PLOT_H, flexShrink: 0 }}>
        {ticks.map(t => (
          <span key={t} className="mono" style={{
            position: 'absolute', right: 0, bottom: y(t) - 6,
            fontSize: 9, color: 'var(--stone)',
          }}>{t / 60}h</span>
        ))}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: 'relative', height: PLOT_H }}>
          {/* Gridlines */}
          {ticks.map(t => (
            <div key={t} style={{ position: 'absolute', left: 0, right: 0, bottom: y(t), height: 1, background: 'var(--hairline-soft)' }}/>
          ))}
          {/* Contract reference line */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: y(contractMin), height: 0,
            borderTop: '1px dashed var(--charcoal)', opacity: 0.55, zIndex: 2,
          }}>
            <span className="mono" style={{
              position: 'absolute', right: 0, bottom: 2, fontSize: 9, fontWeight: 600,
              color: 'var(--charcoal)', background: 'var(--canvas)', padding: '0 3px',
            }}>{fmtHM(contractMin)}</span>
          </div>
          {/* Baseline */}
          <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, background: 'var(--hairline-strong)' }}/>

          {/* Bars */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', gap: 3, padding: '0 2px' }}>
            {weeks.map(w => {
              const base = Math.min(w.minutes, contractMin);
              const over = Math.max(0, w.minutes - contractMin);
              const isCurrent = w.monday === currentMonday;
              const isSel = w.monday === selWeek;
              const dim = selWeek && !isSel;
              return (
                <button key={w.monday} onClick={() => onSelect(w.monday)}
                  style={{
                    flex: 1, maxWidth: 40, height: '100%', padding: 0, border: 'none',
                    background: 'none', cursor: 'pointer', position: 'relative',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'stretch',
                    opacity: dim ? 0.45 : isCurrent ? 0.65 : 1, transition: 'opacity 0.12s',
                  }}
                >
                  {over > 0 && (
                    <div style={{
                      height: Math.max(2, y(over)), background: BAR_OVER,
                      borderRadius: '4px 4px 0 0', marginBottom: 2, flexShrink: 0,
                    }}/>
                  )}
                  <div style={{
                    height: Math.max(2, y(base)), background: BAR_BASE, flexShrink: 0,
                    borderRadius: over > 0 ? 0 : '4px 4px 0 0',
                    border: isCurrent ? '1px dashed var(--primary)' : 'none',
                  }}/>
                  {isSel && (
                    <div style={{ position: 'absolute', inset: -2, borderRadius: 6, border: '1.5px solid var(--primary)', pointerEvents: 'none' }}/>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* X labels */}
        <div style={{ display: 'flex', gap: 3, padding: '4px 2px 0' }}>
          {weeks.map((w, i) => (
            <span key={w.monday} className="mono" style={{
              flex: 1, maxWidth: 40, textAlign: 'center', fontSize: 9, color: 'var(--stone)',
            }}>
              {(weeks.length - 1 - i) % labelEvery === 0 ? w.label : ''}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Heures;
