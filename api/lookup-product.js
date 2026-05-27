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

export default async function handler(req, res) {
  const { ean } = req.query;
  if (!ean) return res.status(400).json({ error: 'missing_ean' });

  try {
    const offRes = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${ean}.json`,
      { headers: { 'User-Agent': 'DLC-Scanner/2.0 (contact@dlcscan.app)' } }
    );
    if (!offRes.ok) return res.status(404).json({ error: 'not_found' });

    const json = await offRes.json();
    if (json.status !== 1 || !json.product) {
      return res.status(404).json({ error: 'not_found' });
    }

    const p = json.product;
    const title = (p.product_name_fr || p.product_name || '').trim();
    if (!title) return res.status(404).json({ error: 'not_found' });

    return res.status(200).json({
      ean,
      title,
      brand: p.brands ? p.brands.split(',')[0].trim() : null,
      weight: p.quantity || null,
      image_url: null,
      category: mapCategory(p.categories_tags),
      source: 'openfoodfacts',
    });
  } catch {
    return res.status(404).json({ error: 'not_found' });
  }
}
