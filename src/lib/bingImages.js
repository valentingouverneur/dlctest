async function fetchPackshots(title, brand, count, ean) {
  const url = new URL('/api/search-image', window.location.origin);
  url.searchParams.set('title', title || '');
  if (brand) url.searchParams.set('brand', brand);
  if (ean) url.searchParams.set('ean', ean);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    return (json.images ?? []).slice(0, count);
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
