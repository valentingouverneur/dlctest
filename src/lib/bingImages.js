const ENDPOINT = 'https://serpapi.com/search.json';

export async function searchPackshot(title, brand) {
  const key = import.meta.env.VITE_SERPAPI_KEY;
  if (!key) return null;

  const q = [title, brand].filter(Boolean).join(' ') + ' packshot';
  const url = new URL(ENDPOINT);
  url.searchParams.set('engine', 'google_images');
  url.searchParams.set('q', q);
  url.searchParams.set('num', '3');
  url.searchParams.set('safe', 'active');
  url.searchParams.set('api_key', key);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return null;
    const json = await res.json();
    return json.images_results?.[0]?.original ?? json.images_results?.[0]?.thumbnail ?? null;
  } catch {
    return null;
  }
}
