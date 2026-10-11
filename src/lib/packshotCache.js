// v2: results before 2026-10-11 were unfiltered (OFF duplicates, logos).
const KEY = 'dlc_packshots_v2';
const TTL = 7 * 24 * 60 * 60 * 1000; // 7 jours
// Google found nothing: don't ask again for a day. Without this, every
// image-less product was re-searched on each Affiche load. Errors (quota,
// network) never reach the cache, so they are retried normally.
const EMPTY_TTL = 24 * 60 * 60 * 1000;

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; }
}

function save(cache) {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch {}
}

/** Cached urls, [] for a remembered empty result, null on miss/expiry. */
export function getCachedPackshots(ean) {
  const entry = load()[ean];
  if (!entry) return null;
  const ttl = entry.urls.length ? TTL : EMPTY_TTL;
  if (Date.now() - entry.ts > ttl) return null;
  return entry.urls;
}

export function setCachedPackshots(ean, urls) {
  const cache = load();
  cache[ean] = { urls, ts: Date.now() };
  save(cache);
}
