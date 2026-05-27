export default async function handler(req, res) {
  const { title, brand, ean } = req.query;
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  if (!key || !cx) {
    return res.status(200).json({ images: [] });
  }

  const q = ean
    ? `${ean} emballage`
    : [title, brand].filter(Boolean).join(' ') + ' packshot';
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', q);
  url.searchParams.set('searchType', 'image');
  url.searchParams.set('num', '3');
  url.searchParams.set('safe', 'active');

  try {
    const gRes = await fetch(url.toString());
    if (!gRes.ok) return res.status(200).json({ images: [] });
    const json = await gRes.json();
    const images = (json.items ?? [])
      .slice(0, 3)
      .map(item => item.link)
      .filter(Boolean);
    return res.status(200).json({ images });
  } catch {
    return res.status(200).json({ images: [] });
  }
}
