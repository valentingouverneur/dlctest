const KEY = 'dlc_scans';
const MAX = 500;

function today0() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}

function save(arr) {
  try { localStorage.setItem(KEY, JSON.stringify(arr)); } catch {}
}

// Save full product entry (or update existing EAN entry)
export function addScan(product) {
  const history = getHistory().filter(h => h.ean !== product.ean);
  const entry = {
    ean: product.ean, title: product.title, brand: product.brand,
    weight: product.weight, image_url: product.image_url,
    category: product.category, ts: Date.now(),
  };
  const next = [entry, ...history].slice(0, MAX);
  save(next);
  return next;
}

// Save minimal EAN entry when product data isn't available yet
export function addEanScan(ean) {
  const history = getHistory();
  if (history[0]?.ean === ean && history[0]?.ts > Date.now() - 2000) return history;
  const filtered = history.filter(h => h.ean !== ean);
  const next = [{ ean, ts: Date.now() }, ...filtered].slice(0, MAX);
  save(next);
  return next;
}

export function getTodayCount() {
  return getHistory().filter(h => h.ts >= today0()).length;
}

// Only entries that have full product data (for the recent strip)
export function getRecentWithData(n = 4) {
  return getHistory().filter(h => h.title).slice(0, n);
}
