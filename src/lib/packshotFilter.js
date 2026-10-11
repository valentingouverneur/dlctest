// Cleans Google CSE image results before they become packshot suggestions.
// Shared by api/search-image.js (server) and scripts/check-packshots.mjs.
//
// Google answers EAN queries mostly with Open Food Facts pages, so raw results
// are the same OFF photo in several sizes plus site logos and OFF's own SVG
// icons. OFF is already the app's fallback image, so OFF hits go last: a
// suggestion is only useful when it differs from what OFF already gives us.

const JUNK = /\.(svg|gif)(\?|$)|logo|icon|favicon|placeholder|sprite/i;
const OFF_HOST = /(^|\.)openfoodfacts\.(org|net)$/;

function offKey(url) {
  // .../front_en.66.400.jpg, .../front_en.66.full.jpg → .../front_en.66
  return url.replace(/\.(\d+|full)\.(jpe?g|png|webp)$/i, '');
}

export function filterPackshots(urls, max = 3) {
  const seen = new Set();
  const others = [];
  const off = [];
  for (const url of urls || []) {
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) continue;
    let host;
    try { host = new URL(url).hostname; } catch { continue; }
    if (JUNK.test(url)) continue;
    const isOff = OFF_HOST.test(host);
    const key = isOff ? offKey(url) : url;
    if (seen.has(key)) continue;
    seen.add(key);
    (isOff ? off : others).push(url);
  }
  return [...others, ...off].slice(0, max);
}
