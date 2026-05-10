export default async function handler(req, res) {
  const { title, brand } = req.query;
  const key = process.env.SERPAPI_KEY;

  if (!key) {
    return res.status(200).json({ images: [] });
  }

  const q = [title, brand].filter(Boolean).join(' ') + ' packshot';
  const url = new URL('https://serpapi.com/search.json');
  url.searchParams.set('engine', 'google_images');
  url.searchParams.set('q', q);
  url.searchParams.set('num', '3');
  url.searchParams.set('safe', 'active');
  url.searchParams.set('api_key', key);

  try {
    const serpRes = await fetch(url.toString());
    if (!serpRes.ok) return res.status(200).json({ images: [] });
    const json = await serpRes.json();
    const images = (json.images_results ?? [])
      .slice(0, 3)
      .map(r => r.original ?? r.thumbnail)
      .filter(Boolean);
    return res.status(200).json({ images });
  } catch {
    return res.status(200).json({ images: [] });
  }
}
