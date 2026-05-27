# OFF Proxy + Google CSE Packshots Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corriger le CORS OFF en proxyfiant l'appel via Vercel, et remplacer SerpAPI par Google Custom Search API pour les packshots.

**Architecture:** Deux nouveaux/réécrits endpoints Vercel serverless (`api/lookup-product.js` et `api/search-image.js`) font les appels externes côté serveur. `src/lib/openFoodFacts.js` devient un thin wrapper qui appelle le proxy local. Aucun composant React n'est touché.

**Tech Stack:** Vercel Serverless Functions (ES modules, Node 24), Google Custom Search JSON API, Open Food Facts API v0

---

## Fichiers

| Fichier | Action |
|---------|--------|
| `api/lookup-product.js` | **Créer** — proxy OFF server-side |
| `api/search-image.js` | **Réécrire** — SerpAPI → Google CSE |
| `src/lib/openFoodFacts.js` | **Modifier** — appelle `/api/lookup-product` |

---

## Prérequis : Setup Google CSE (une seule fois, avant de coder)

- [ ] Aller sur [console.cloud.google.com](https://console.cloud.google.com)
  - Créer ou sélectionner un projet
  - Activer l'API **Custom Search JSON API**
  - Créer une clé API → noter la valeur (`GOOGLE_CSE_KEY`)

- [ ] Aller sur [cse.google.com](https://cse.google.com/cse/all)
  - Créer un moteur → dans "Sites à rechercher" mettre `*.com` puis activer **"Rechercher sur tout le web"** dans les paramètres avancés
  - Copier l'**Identifiant du moteur de recherche** (format `xxxxxxxxxxxxxxx:xxxxxxxxx`) → noter (`GOOGLE_CSE_ID`)

- [ ] Ajouter dans `.env.local` :
  ```
  GOOGLE_CSE_KEY=ta_cle_api_google
  GOOGLE_CSE_ID=ton_cx_id
  ```

- [ ] Ajouter les mêmes variables sur Vercel :
  - Dashboard Vercel → projet dlcscan → Settings → Environment Variables
  - Ajouter `GOOGLE_CSE_KEY` et `GOOGLE_CSE_ID` pour tous les environnements (Production + Preview + Development)
  - Supprimer `SERPAPI_KEY` si elle est présente

---

## Task 1 : Créer `api/lookup-product.js`

**Fichiers :**
- Créer : `api/lookup-product.js`

Ce fichier proxyfie l'API OFF côté serveur (pas de CORS). Il contient aussi la logique de mapping des catégories, qui migre depuis `src/lib/openFoodFacts.js`.

- [ ] **Créer `api/lookup-product.js`** avec le contenu suivant :

```javascript
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
```

- [ ] **Commit**

```bash
git add api/lookup-product.js
git commit -m "feat: proxy OFF API via Vercel function to fix CORS"
```

---

## Task 2 : Mettre à jour `src/lib/openFoodFacts.js`

**Fichiers :**
- Modifier : `src/lib/openFoodFacts.js`

`fetchFromOFF` appelle désormais `/api/lookup-product` (même origin, pas de CORS). La logique mapCategory et l'appel direct à OFF sont supprimés.

- [ ] **Remplacer entièrement `src/lib/openFoodFacts.js`** par :

```javascript
export async function fetchFromOFF(ean) {
  try {
    const res = await fetch(`/api/lookup-product?ean=${ean}`);
    if (res.status === 404) return null;
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
```

- [ ] **Commit**

```bash
git add src/lib/openFoodFacts.js
git commit -m "refactor: fetchFromOFF uses local proxy, removes direct OFF call"
```

---

## Task 3 : Réécrire `api/search-image.js`

**Fichiers :**
- Modifier : `api/search-image.js`

SerpAPI est remplacé par Google Custom Search JSON API. Interface entrée/sortie identique — `src/lib/bingImages.js` et tous les composants restent inchangés.

- [ ] **Remplacer entièrement `api/search-image.js`** par :

```javascript
export default async function handler(req, res) {
  const { title, brand } = req.query;
  const key = process.env.GOOGLE_CSE_KEY;
  const cx = process.env.GOOGLE_CSE_ID;

  if (!key || !cx) {
    return res.status(200).json({ images: [] });
  }

  const q = [title, brand].filter(Boolean).join(' ') + ' packshot';
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
```

- [ ] **Commit**

```bash
git add api/search-image.js
git commit -m "feat: replace SerpAPI with Google Custom Search for packshots"
```

---

## Task 4 : Déployer et vérifier

Les routes `/api/*` ne fonctionnent pas avec `npm run dev` (pas de proxy Vite). Le test se fait via Vercel.

- [ ] **Pousser la branche et déployer sur Vercel preview**

```bash
git push
```

Vercel crée automatiquement un preview deployment — noter l'URL (ex: `dlcscan-git-main-xxx.vercel.app`).

- [ ] **Vérifier le proxy OFF** — ouvrir dans le navigateur :
  ```
  https://<preview-url>/api/lookup-product?ean=3292070001576
  ```
  Résultat attendu :
  ```json
  { "ean": "3292070001576", "title": "...", "brand": "...", "source": "openfoodfacts" }
  ```
  Si `{ "error": "not_found" }` → l'EAN n'existe pas dans OFF, essayer un autre EAN connu.

- [ ] **Vérifier la recherche d'image** — ouvrir dans le navigateur :
  ```
  https://<preview-url>/api/search-image?title=Filets%20de%20lieu%20noir&brand=Findus
  ```
  Résultat attendu :
  ```json
  { "images": ["https://...", "https://...", "https://..."] }
  ```
  Si `{ "images": [] }` → vérifier que `GOOGLE_CSE_KEY` et `GOOGLE_CSE_ID` sont bien définis dans les env vars Vercel (Settings → Environment Variables).

- [ ] **Vérifier end-to-end dans l'app** — scanner un EAN ou aller sur `/p/<ean>` :
  - La fiche produit affiche titre + marque (OFF fonctionne)
  - Le banner packshot apparaît avec une image de qualité (Google CSE fonctionne)
  - Plus d'erreur CORS dans l'inspecteur

- [ ] **Si tout est bon : promouvoir en production**
  - Vercel Dashboard → preview deployment → "Promote to Production"
  - Ou : `git push origin main` si déjà sur main
