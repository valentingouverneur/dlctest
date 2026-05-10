const ENDPOINT = 'https://serpapi.com/search.json';

async function fetchPackshots(title, brand, count) {
  const key = import.meta.env.VITE_SERPAPI_KEY;
  if (!key) return [];
  const q = [title, brand].filter(Boolean).join(' ') + ' packshot';
  const url = new URL(ENDPOINT);
  url.searchParams.set('engine', 'google_images');
  url.searchParams.set('q', q);
  url.searchParams.set('num', String(count));
  url.searchParams.set('safe', 'active');
  url.searchParams.set('api_key', key);
  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    return (json.images_results ?? []).slice(0, count).map(r => r.original ?? r.thumbnail).filter(Boolean);
  } catch {
    return [];
  }
}

export async function searchPackshots(title, brand, count = 3) {
  return fetchPackshots(title, brand, count);
}

export async function searchPackshot(title, brand) {
  const results = await fetchPackshots(title, brand, 1);
  return results[0] ?? null;
}
