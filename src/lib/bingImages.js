async function fetchPackshots(title, brand, count) {
  const url = new URL('/api/search-image', window.location.origin);
  url.searchParams.set('title', title || '');
  if (brand) url.searchParams.set('brand', brand);

  try {
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const json = await res.json();
    return (json.images ?? []).slice(0, count);
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
