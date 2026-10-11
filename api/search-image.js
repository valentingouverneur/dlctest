import { filterPackshots } from '../src/lib/packshotFilter.js';

export default async function handler(req, res) {
  const { title, brand, ean } = req.query;
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  if (!key || !cx) {
    return res.status(200).json({ images: [], error: 'not_configured' });
  }

  const q = ean
    ? `${ean} emballage`
    : [title, brand].filter(Boolean).join(' ') + ' packshot';
  const url = new URL('https://www.googleapis.com/customsearch/v1');
  url.searchParams.set('key', key);
  url.searchParams.set('cx', cx);
  url.searchParams.set('q', q);
  url.searchParams.set('searchType', 'image');
  // 10 is the max per call and costs the same quota as 3: fetch them all so
  // filtering out OFF duplicates and logos still leaves real suggestions.
  url.searchParams.set('num', '10');
  url.searchParams.set('safe', 'active');

  try {
    const gRes = await fetch(url.toString());
    if (!gRes.ok) {
      // 429 = daily quota exhausted, 403 = key/API disabled. Log it so it shows
      // in Vercel logs instead of looking like "no image found".
      const body = await gRes.text().catch(() => '');
      console.error('Google CSE error', gRes.status, body.slice(0, 300));
      return res.status(502).json({ images: [], error: gRes.status === 429 ? 'quota' : 'google_' + gRes.status });
    }
    const json = await gRes.json();
    const images = filterPackshots((json.items ?? []).map(item => item.link));
    return res.status(200).json({ images });
  } catch (err) {
    console.error('Google CSE fetch failed', err);
    return res.status(502).json({ images: [], error: 'fetch_failed' });
  }
}
