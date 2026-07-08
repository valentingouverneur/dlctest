import { supabase, isSupabaseConfigured } from './supabase';

// ─── Supabase CRUD ───────────────────────────────────────────────────

function mapError(error) {
  if (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('relation')) {
    return new Error('TABLE_MISSING');
  }
  return new Error(error.message || 'Erreur Supabase');
}

/**
 * Load all recorded work days, oldest first.
 * Returns [] if Supabase is unconfigured; throws TABLE_MISSING if the
 * work_days table has not been created yet.
 */
export async function listWorkDays() {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await supabase
    .from('work_days')
    .select('day, segments, note, created_at, updated_at')
    .order('day', { ascending: true })
    .limit(730);

  if (error) throw mapError(error);
  return data || [];
}

/**
 * Insert or update a day. segments = [] records an explicit day off.
 */
export async function upsertWorkDay(day, segments, note) {
  if (!isSupabaseConfigured || !supabase) {
    throw new Error('Supabase non configuré');
  }

  const payload = { day, segments, note: note?.trim() || null };
  const { data, error } = await supabase
    .from('work_days')
    .upsert(payload, { onConflict: 'day' })
    .select('day, segments, note, created_at, updated_at')
    .single();

  if (error) throw mapError(error);
  return data;
}

export async function deleteWorkDay(day) {
  if (!isSupabaseConfigured || !supabase) return;
  const { error } = await supabase.from('work_days').delete().eq('day', day);
  if (error) throw mapError(error);
}

// ─── Time math ───────────────────────────────────────────────────────

/** "06:30" → 390 minutes. Returns null for empty/invalid input. */
export function parseHM(s) {
  if (!s || !/^\d{1,2}:\d{2}$/.test(s)) return null;
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
}

/** Duration of one segment in minutes; overnight segments wrap past midnight. */
export function segMinutes(seg) {
  const start = parseHM(seg?.start);
  const end = parseHM(seg?.end);
  if (start === null || end === null) return 0;
  return end >= start ? end - start : end + 24 * 60 - start;
}

/** Total worked minutes for a day's segments. */
export function dayMinutes(segments) {
  return (segments || []).reduce((sum, seg) => sum + segMinutes(seg), 0);
}

/** 2345 → "39h05" ; 2340 → "39h" ; 45 → "0h45". */
export function fmtHM(minutes) {
  const sign = minutes < 0 ? '−' : '';
  const abs = Math.abs(Math.round(minutes));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  return sign + h + 'h' + (m > 0 ? String(m).padStart(2, '0') : '');
}

/** Signed delta: 135 → "+2h15" ; -90 → "−1h30" ; 0 → "±0h". */
export function fmtDelta(minutes) {
  if (Math.round(minutes) === 0) return '±0h';
  return (minutes > 0 ? '+' : '') + fmtHM(minutes);
}

// ─── Dates and ISO weeks ─────────────────────────────────────────────

/** Date → "YYYY-MM-DD" in local time. */
export function toDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** "YYYY-MM-DD" → local Date at midnight. */
export function fromDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = fromDayKey(key);
  d.setDate(d.getDate() + n);
  return toDayKey(d);
}

/** Monday of the ISO week containing the given day key. */
export function mondayOf(key) {
  const d = fromDayKey(key);
  const shift = (d.getDay() + 6) % 7; // Mon=0 … Sun=6
  d.setDate(d.getDate() - shift);
  return toDayKey(d);
}

/** ISO week number + year for a day key, e.g. { year: 2026, week: 27, label: "S27" }. */
export function isoWeekOf(key) {
  const d = fromDayKey(key);
  // ISO: week containing the Thursday
  const th = new Date(d);
  th.setDate(th.getDate() + 3 - ((th.getDay() + 6) % 7));
  const jan4 = new Date(th.getFullYear(), 0, 4);
  const week = 1 + Math.round(((th - jan4) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7);
  return { year: th.getFullYear(), week, label: 'S' + week };
}

/**
 * Group recorded days into ISO weeks, oldest first.
 * Each week: { monday, label, year, week, minutes, days: {dayKey: row} }.
 */
export function groupWeeks(rows) {
  const byMonday = new Map();
  for (const row of rows) {
    const monday = mondayOf(row.day);
    if (!byMonday.has(monday)) {
      const iso = isoWeekOf(monday);
      byMonday.set(monday, { monday, ...iso, minutes: 0, days: {} });
    }
    const w = byMonday.get(monday);
    w.days[row.day] = row;
    w.minutes += dayMinutes(row.segments);
  }
  return [...byMonday.values()].sort((a, b) => (a.monday < b.monday ? -1 : 1));
}

// ─── Journée type + contract (localStorage) ──────────────────────────

const TEMPLATE_KEY = 'dlc_work_template';
const CONTRACT_KEY = 'dlc_contract_hours';

// Keyed by JS getDay(): 0=dimanche … 6=samedi. Edit once in the page settings.
const DEFAULT_TEMPLATE = {
  0: [],
  1: [{ start: '08:00', end: '13:00' }, { start: '14:00', end: '17:00' }],
  2: [{ start: '08:00', end: '13:00' }, { start: '14:00', end: '17:00' }],
  3: [{ start: '08:00', end: '13:00' }, { start: '14:00', end: '17:00' }],
  4: [{ start: '08:00', end: '13:00' }, { start: '14:00', end: '17:00' }],
  5: [{ start: '08:00', end: '13:00' }, { start: '14:00', end: '17:00' }],
  6: [],
};

export function getTemplate() {
  try {
    const raw = localStorage.getItem(TEMPLATE_KEY);
    if (raw) return { ...DEFAULT_TEMPLATE, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_TEMPLATE;
}

export function saveTemplate(template) {
  try { localStorage.setItem(TEMPLATE_KEY, JSON.stringify(template)); } catch {}
}

export function getContractHours() {
  const v = parseFloat(localStorage.getItem(CONTRACT_KEY));
  return Number.isFinite(v) && v > 0 ? v : 39;
}

export function saveContractHours(hours) {
  try { localStorage.setItem(CONTRACT_KEY, String(hours)); } catch {}
}
