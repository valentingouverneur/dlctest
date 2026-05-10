const ENDPOINT = 'https://api.bing.microsoft.com/v7.0/images/search';

export async function searchPackshot(title, brand) {
  const key = import.meta.env.VITE_BING_KEY;
  if (!key) return null;

  const q = [title, brand].filter(Boolean).join(' ');
  const url = new URL(ENDPOINT);
  url.searchParams.set('q', q);
  url.searchParams.set('count', '3');
  url.searchParams.set('imageType', 'Product');
  url.searchParams.set('aspect', 'Square');
  url.searchParams.set('minWidth', '200');
  url.searchParams.set('minHeight', '200');
  url.searchParams.set('safeSearch', 'Strict');

  try {
    const res = await fetch(url.toString(), {
      headers: { 'Ocp-Apim-Subscription-Key': key },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Prefer contentUrl over thumbnailUrl for better quality
    return json.value?.[0]?.contentUrl ?? json.value?.[0]?.thumbnailUrl ?? null;
  } catch {
    return null;
  }
}
