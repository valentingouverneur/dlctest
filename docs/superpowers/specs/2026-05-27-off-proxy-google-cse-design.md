# Design — Proxy OFF + Google CSE packshots

**Date:** 2026-05-27  
**Status:** Approved

## Problème

Deux bugs de production sur `dlcscan.vercel.app` :

1. **CORS OFF** — `openFoodFacts.js` appelle `world.openfoodfacts.org` directement depuis le navigateur. En production, OFF ne renvoie pas l'en-tête `Access-Control-Allow-Origin`, ce qui bloque toutes les requêtes. En localhost, le navigateur est moins strict → le bug n'apparaissait pas en dev.

2. **SerpAPI quota dépassé** — Le plan gratuit SerpAPI est limité à 100 requêtes/mois. Le quota est épuisé, les packshots ne se chargent plus du tout.

## Solution

Deux changements indépendants à portée minimale :

### 1. Proxy OFF — `api/lookup-product.js`

Nouveau endpoint Vercel serverless. L'appel OFF quitte le navigateur pour passer côté serveur (pas de CORS).

**Interface :**
```
GET /api/lookup-product?ean={ean}
```

**Réponse succès (200) :**
```json
{
  "ean": "3292070001576",
  "title": "Filets de lieu noir",
  "brand": "Findus",
  "weight": "400 g",
  "category": "Poisson",
  "source": "openfoodfacts"
}
```

**Réponse non trouvé (404) :**
```json
{ "error": "not_found" }
```

La logique de mapping catégories (actuellement dans `src/lib/openFoodFacts.js`) migre vers cet endpoint. Le frontend devient un thin wrapper.

### 2. Remplacement SerpAPI → Google Custom Search API — `api/search-image.js`

Le fichier existant est réécrit pour appeler `https://www.googleapis.com/customsearch/v1` avec `searchType=image`. L'interface entrée/sortie reste identique pour ne pas toucher aux composants.

**Requête Google CSE :**
- `q` = `"{title} {brand} packshot"`
- `searchType=image`
- `num=3`
- `safe=active`

**Interface (inchangée) :**
```
GET /api/search-image?title=Xxx&brand=Yyy
→ { images: ["https://...", "https://...", "https://..."] }
→ { images: [] }  si clé absente ou erreur
```

Le comportement de dégradation gracieuse (retour `{ images: [] }` en cas d'absence de clé ou d'erreur) est conservé à l'identique.

## Variables d'environnement

| Variable | Description | Requis |
|----------|-------------|--------|
| `GOOGLE_CSE_KEY` | Clé API Google Cloud (projet avec Custom Search JSON API activée) | Oui |
| `GOOGLE_CSE_ID` | Identifiant du moteur CSE (format `xxxxxxxx:xxxxxxxxx`) | Oui |
| `SERPAPI_KEY` | **À supprimer** — plus utilisée | — |

### Setup Google CSE (une seule fois)
1. Google Cloud Console → activer **Custom Search JSON API**
2. [cse.google.com](https://cse.google.com) → créer un moteur → cocher "Rechercher sur tout le web"
3. Récupérer `cx` (= `GOOGLE_CSE_ID`) et clé API (= `GOOGLE_CSE_KEY`)
4. Quota gratuit : **100 requêtes/jour** (~3 000/mois), puis $5/1 000

## Fichiers modifiés

| Fichier | Changement |
|---------|-----------|
| `api/lookup-product.js` | **Nouveau** — proxy OFF server-side |
| `api/search-image.js` | **Réécrit** — SerpAPI → Google CSE |
| `src/lib/openFoodFacts.js` | Appelle `/api/lookup-product` au lieu d'OFF directement ; retire la logique de mapping |

**Aucun composant React ne change.** Les signatures de `fetchFromOFF()`, `searchPackshot()` et `searchPackshots()` restent identiques.

## Ce qui ne change pas

- `src/lib/bingImages.js` — appelle toujours `/api/search-image`, même interface
- `src/pages/Product.jsx` — même chaîne Supabase → OFF → Not Found
- `src/pages/Affiche.jsx` — même logique packshot
- `src/pages/DesktopShell.jsx` — aucune modification
- Tous les autres composants

## Contraintes

- Pas de cache côté serveur pour l'instant (hors scope) — chaque scan fait un appel OFF et potentiellement un appel Google CSE
- Le quota Google CSE (100/jour) couvre le volume attendu (1–50 produits/jour) sans jamais payer en pratique
