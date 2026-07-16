// Parser for raw Infomil "Statistiques sur une période - Articles" CSV exports.
// Pure module (no imports) so it can be verified in Node: scripts/check-infomil.mjs

const COLUMN_ALIASES = {
  ean: ['EAN'],
  designation: ['Désignation', 'Designation'],
  ca_ttc: ['CA TTC'],
  uvc: ['UVC'],
  mpaf_ht_pct: ['MPAF HT(%)'],
  mpaf: ['MPAF'],
  freq: ['Fréq', 'Freq'],
  panier: ['Panier'],
  casse_paf: ['Casse PAF'],
  casse_uvc: ['Casse(UVC)'],
};

export const COLUMN_LABELS = {
  ean: 'EAN', designation: 'Désignation', ca_ttc: 'CA TTC', uvc: 'UVC',
  mpaf_ht_pct: 'MPAF HT(%)', mpaf: 'MPAF', freq: 'Fréq', panier: 'Panier',
  casse_paf: 'Casse PAF', casse_uvc: 'Casse (UVC)',
};

const REQUIRED = ['ean', 'designation', 'ca_ttc', 'uvc'];
const INT_KEYS = new Set(['uvc', 'freq', 'casse_uvc']);
const TOTAL_KEYS = ['ca_ttc', 'uvc', 'mpaf'];

// Quote-aware split of one CSV line on ';' ("" is an escaped quote).
function splitLine(line) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; } else inQ = false;
      } else cur += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ';') { out.push(cur); cur = ''; }
    else cur += ch;
  }
  out.push(cur);
  return out;
}

// '="3017809486017"' (Excel text protection) or plain '3017809486017' -> digits.
function unwrapEan(field) {
  const m = (field || '').trim().match(/^(?:="?)?(\d+)"?$/);
  return m ? m[1] : null;
}

function parseNum(field, isInt) {
  const s = (field || '').trim();
  if (s === '') return null;
  const v = isInt ? parseInt(s, 10) : parseFloat(s.replace(',', '.'));
  return Number.isFinite(v) ? v : null;
}

function isoWeek(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { num: Math.ceil(((d - yearStart) / 86400000 + 1) / 7), year: d.getUTCFullYear() };
}

export function parseInfomilCsv(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1); // UTF-8 BOM
  const lines = text.split(/\r?\n/);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (splitLine(lines[i])[0].trim() === 'EAN') { headerIdx = i; break; }
  }
  if (headerIdx === -1) return { error: 'Format non reconnu : en-tête "EAN" introuvable. Dépose l\'export Infomil brut (Statistiques sur une période).' };

  const header = splitLine(lines[headerIdx]).map(h => h.trim());
  const idx = {};
  const found = [], missing = [];
  for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
    const at = header.findIndex(h => aliases.includes(h));
    if (at === -1) missing.push(key); else { idx[key] = at; found.push(key); }
  }
  const missingRequired = REQUIRED.filter(k => missing.includes(k));
  if (missingRequired.length > 0) {
    return { error: 'Colonnes obligatoires absentes : ' + missingRequired.map(k => COLUMN_LABELS[k]).join(', ') + '. Ajoute-les au modèle de stats Infomil.' };
  }

  const rows = [];
  let totals = null;
  const meta = { rayon: null, rayonCode: null, exportedAt: null };

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const rayonMatch = line.match(/Liste éléments rayon\s*:\s*(\d+)\s+(.+?)\s*$/);
    if (rayonMatch) { meta.rayonCode = rayonMatch[1]; meta.rayon = rayonMatch[2]; continue; }
    const dateMatch = line.match(/Exporté le (\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
    if (dateMatch) {
      const [, dd, mm, yy, h, mn, s] = dateMatch.map(Number);
      meta.exportedAt = new Date(2000 + yy, mm - 1, dd, h, mn, s);
      continue;
    }

    const fields = splitLine(line);
    const ean = unwrapEan(fields[idx.ean]);
    if (ean && ean.length >= 8) {
      const row = { ean, designation: (fields[idx.designation] || '').trim() };
      for (const key of Object.keys(COLUMN_ALIASES)) {
        if (key === 'ean' || key === 'designation') continue;
        row[key] = key in idx ? parseNum(fields[idx[key]], INT_KEYS.has(key)) : null;
      }
      rows.push(row);
    } else if (!totals && rows.length > 0 && 'ca_ttc' in idx && parseNum(fields[idx.ca_ttc]) != null) {
      // Totals row: no EAN, but numeric sums in the metric columns.
      totals = {};
      for (const key of Object.keys(COLUMN_ALIASES)) {
        if (key === 'ean' || key === 'designation') continue;
        totals[key] = key in idx ? parseNum(fields[idx[key]], INT_KEYS.has(key)) : null;
      }
    }
  }

  if (rows.length === 0) return { error: 'Aucune ligne produit trouvée dans le fichier.' };

  const integrity = { ok: true, deltas: {} };
  if (totals) {
    for (const key of TOTAL_KEYS) {
      if (!(key in idx) || totals[key] == null) continue;
      const computed = rows.reduce((s, r) => s + (r[key] || 0), 0);
      const official = totals[key];
      if (Math.abs(computed - official) > Math.max(1, Math.abs(official) * 0.005)) {
        integrity.ok = false;
        integrity.deltas[key] = { computed: Math.round(computed * 100) / 100, official };
      }
    }
  }

  return { rows, columns: { found, missing }, totals, meta, integrity };
}

// Week from the file name ("s28.csv") first — the user names exports by week —
// else ISO week of (export date − 1 day): exports happen just after the week closes.
export function deriveWeek(fileName, meta) {
  const m = (fileName || '').match(/(?:^|[^a-z0-9])s(\d{1,2})(?![0-9])/i);
  if (m) {
    const year = meta.exportedAt ? isoWeek(meta.exportedAt).year : new Date().getFullYear();
    const num = parseInt(m[1], 10);
    return { num, key: year + '-S' + String(num).padStart(2, '0') };
  }
  if (meta.exportedAt) {
    const w = isoWeek(new Date(meta.exportedAt.getTime() - 86400000));
    return { num: w.num, key: w.year + '-S' + String(w.num).padStart(2, '0') };
  }
  return null;
}

export function titleCase(s) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function buildLabel(week, meta, fileName) {
  const parts = [];
  if (week) parts.push('S' + week.num);
  if (meta.rayon) parts.push(titleCase(meta.rayon));
  return parts.length > 0 ? parts.join(' · ') : fileName;
}
