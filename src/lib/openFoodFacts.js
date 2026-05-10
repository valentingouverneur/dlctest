const BASE = 'https://world.openfoodfacts.org/api/v0/product';

function mapCategory(tags) {
  if (!Array.isArray(tags) || !tags.length) return null;
  const t = tags.join(' ').toLowerCase();
  if (/glace|ice.cream|sorbet/.test(t)) return 'Glaces';
  if (/surgel|frozen/.test(t)) return 'Glaces';
  if (/pizza/.test(t)) return 'Pizza';
  if (/frite|fry/.test(t)) return 'Frites';
  if (/viande|meat|boeuf|porc|veau|agneau|poulet|volaille|dinde/.test(t)) return 'Viande';
  if (/poisson|fish|seafood|saumon|thon|cabillaud/.test(t)) return 'Poisson';
  if (/l[eé]gume|vegetable|carotte|petits.pois/.test(t)) return 'Légumes';
  if (/plat.cuisiné|prepared|lasagne|hachis|gratin/.test(t)) return 'Plats cuisinés';
  if (/entr[eé]e|terrine|pâté/.test(t)) return 'Entrée';
  return null;
}

export async function fetchFromOFF(ean) {
  const res = await fetch(`${BASE}/${ean}.json`, {
    headers: { 'User-Agent': 'DLC-Scanner/2.0 (contact@dlcscan.app)' },
  });
  if (!res.ok) throw new Error(`OFF ${res.status}`);
  const json = await res.json();
  if (json.status !== 1 || !json.product) return null;

  const p = json.product;
  const title = (p.product_name_fr || p.product_name || '').trim();
  if (!title) return null;

  return {
    ean,
    title,
    brand: p.brands ? p.brands.split(',')[0].trim() : null,
    weight: p.quantity || null,
    image_url: null, // images sourced from Bing, not OFF
    category: mapCategory(p.categories_tags),
    source: 'openfoodfacts',
  };
}
