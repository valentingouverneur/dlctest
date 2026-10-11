import { getCachedPackshots, setCachedPackshots } from './packshotCache';

// Affiche lists every scan ever made, but only the most recent ones need a
// packshot right away. Older rows search on click, so opening the page
// doesn't spend the Google CSE daily quota (100 free) on the whole history.
export const AUTO_PACKSHOT_LIMIT = 20;

async function fetchPackshots(title, brand, count, ean) {
  // Cache hit — no API call
  if (ean) {
    const cached = getCachedPackshots(ean);
    if (cached) return cached.slice(0, count);
  }

  const url = new URL('/api/search-image', window.location.origin);
  url.searchParams.set('title', title || '');
  if (brand) url.searchParams.set('brand', brand);
  if (ean) url.searchParams.set('ean', ean);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    const images = (json.images ?? []).slice(0, count);
    if (ean) setCachedPackshots(ean, json.images ?? []);
    return images;
  } catch {
    return [];
  }
}

export async function searchPackshots(title, brand, count = 3, ean) {
  return fetchPackshots(title, brand, count, ean);
}

export async function searchPackshot(title, brand, ean) {
  const results = await fetchPackshots(title, brand, 1, ean);
  return results[0] ?? null;
}
