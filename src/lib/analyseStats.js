// Derived analytics over parsed Infomil rows. Null-tolerant: any metric can be null
// when its column was absent from the export. Pure module (Node-verifiable).

export function riskScore(p) {
  if (!p.uvc) return -Infinity;
  return ((p.ca_ttc || 0) / p.uvc) * ((p.mpaf_ht_pct || 0) / 100);
}

export function efficiency(p) {
  return (p.ca_ttc || 0) * (p.freq || 0) * ((p.mpaf_ht_pct || 0) / 100);
}

export function isStar(p) {
  return (p.ca_ttc || 0) > 300 && (p.mpaf_ht_pct || 0) > 20;
}

export function computeStats(rows) {
  const total = rows.reduce((s, r) => s + (r.ca_ttc || 0), 0);
  const totalMpaf = rows.reduce((s, r) => s + (r.mpaf || 0), 0);
  const totalUvc = rows.reduce((s, r) => s + (r.uvc || 0), 0);
  const totalCasse = rows.reduce((s, r) => s + (r.casse_paf || 0), 0);

  const topCa = [...rows].sort((a, b) => (b.ca_ttc || 0) - (a.ca_ttc || 0)).slice(0, 15);
  const topMpaf = [...rows].sort((a, b) => (b.mpaf || 0) - (a.mpaf || 0)).slice(0, 15);
  const topEff = [...rows].sort((a, b) => efficiency(b) - efficiency(a)).slice(0, 15);
  const stars = rows.filter(isStar)
    .sort((a, b) => (b.ca_ttc || 0) * (b.mpaf_ht_pct || 0) - (a.ca_ttc || 0) * (a.mpaf_ht_pct || 0))
    .slice(0, 10);
  const risky = rows.filter(r => (r.uvc || 0) > 0)
    .sort((a, b) => riskScore(a) - riskScore(b)).slice(0, 20);
  const zeros = rows.filter(r => !r.uvc && !r.ca_ttc);
  const casse = rows.filter(r => (r.casse_paf || 0) > 0)
    .sort((a, b) => (b.casse_paf || 0) - (a.casse_paf || 0)).slice(0, 10);

  return { total, totalMpaf, totalUvc, totalCasse, count: rows.length, topCa, topMpaf, topEff, stars, risky, zeros, casse };
}

// For analyses loaded from Supabase: rows are stored, the columns report is not.
export function inferColumns(rows) {
  const keys = ['ca_ttc', 'uvc', 'mpaf_ht_pct', 'mpaf', 'freq', 'panier', 'casse_paf', 'casse_uvc'];
  const found = ['ean', 'designation'], missing = [];
  for (const key of keys) {
    if (rows.some(r => r[key] != null)) found.push(key); else missing.push(key);
  }
  return { found, missing };
}
