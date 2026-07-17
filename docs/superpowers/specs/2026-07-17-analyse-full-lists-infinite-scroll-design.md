# Analyse Rayon — Listes complètes avec infinite scroll

**Date :** 2026-07-17
**Demande :** sur les onglets *Top ventes* et *À risque*, donner accès à toutes les références (~1 100), pas seulement au top 15/20. Option retenue par Valentin : tout afficher, avec chargement progressif au scroll (« infinite reload »).

## Comportement

- Les 3 tableaux de *Top ventes* (CA TTC, MPAF €, score CA×marge×fréquence) et le tableau *À risque* affichent la **liste complète** triée, plus seulement les tops.
- Tris identiques à aujourd'hui : CA décroissant, MPAF € décroissant, `efficiency()` décroissant, `riskScore()` croissant (À risque garde son filtre UVC > 0).
- **Infinite scroll dans `MiniTable`** : 100 lignes rendues au départ ; quand le scroll interne approche du bas (≤ 200 px), +100 lignes, jusqu'à épuisement. Pied de tableau discret « N / total références » tant que tout n'est pas rendu.
- La *Vue d'ensemble* ne change pas (résumés top 10/15 conservés).
- Sauvegardes pré-v2 (sans lignes brutes) : fallback sur les tops stockés — comportement actuel inchangé.

## Implémentation

- `src/pages/Analyse.jsx` :
  - `fullTops = useMemo(...)` : quand `current.rows` existe, calcule les 4 listes complètes triées depuis les lignes brutes (imports `efficiency`, `riskScore` de `lib/analyseStats`).
  - Les tabs consomment `fullTops?.x ?? stats.x` (fallback legacy).
- `MiniTable` (même fichier) : état interne `visible` (chunk de 100), `onScroll` sur la zone scrollable existante (maxHeight 480/300), reset quand `rows.length` change (les instances sont de toute façon démontées au changement d'onglet), footer compteur.
- Zéro dépendance nouvelle, zéro changement de stockage ni de `computeStats`.

## Vérification

- `npm run build` ; contrôle manuel : onglet Top ventes affiche « 100 / 1 139 » puis charge au scroll jusqu'au bout ; numérotation continue ; clic ligne OK ; une vieille sauvegarde legacy affiche toujours son top 15 sans footer.
