const KEY = 'dlc_packshots';
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

function save(cache) {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
}

export function getCachedPackshots(ean) {
  const entry = load()[ean];
  if (!entry) return null;
  if (Date.now() - entry.ts > TTL) return null;
  return entry.urls;
}

export function setCachedPackshots(ean, urls) {
  if (!urls.length) return; // ne pas cacher les résultats vides
  const cache = load();
  cache[ean] = { urls, ts: Date.now() };
  save(cache);
}
