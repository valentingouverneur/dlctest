# Fluidité — code-splitting, images lazy, PWA

**Date :** 2026-07-17
**Objectif :** réduire le temps de démarrage (bundle unique de 522 kB signalé par Vite), alléger le scroll des grilles d'images, rendre l'app installable et tolérante aux coupures réseau en magasin.

## 1. Code-splitting (App.jsx)

- `React.lazy` + `Suspense` pour : `DesktopShell`, `Analyse` (entraîne les charts), `Heures`, `Dlc`, `Catalogue`, `NotFound`.
- Restent dans le bundle initial : `Affiche` (page d'accueil, peinture immédiate), `Scanner` et `Product` (le flux scan → fiche ne doit subir aucun hop réseau).
- Fallback : spinner centré (`Icon.Spinner`), même style que `LoadingState`.
- Pattern uniforme `lazy(() => import(...).then(m => ({ default: m.X })))` (les pages ont des exports nommés).

## 2. Images

- `loading="lazy"` + `decoding="async"` sur les images de grilles/tableaux : cartes Affiche, modal de choix de packshot, `Packshot` (primitives), les 2 `<img>` de DesktopShell.
- Image héro de la fiche Produit : reste eager (contenu principal), gagne `decoding="async"`.
- Pas de travail sur les dimensions : les conteneurs ont déjà `aspectRatio` fixé.

## 3. PWA

- `public/manifest.webmanifest` : name/short_name DLC, `display: standalone`, `theme_color #5645d4`, icônes PNG 192/512 (+ apple-touch 180 pour iOS), `start_url /`.
- Icônes générées : carré arrondi violet `--primary`, « DLC » blanc en mono.
- `public/sw.js`, enregistré depuis `main.jsx` en production uniquement :
  - navigations → network-first avec fallback sur le dernier `index.html` en cache (jamais de bundle figé) ;
  - `/assets/*` (fichiers hashés) et Google Fonts → cache-first ;
  - tout le reste (Supabase, `/api/*`, POST…) → réseau direct, jamais mis en cache.
- `index.html` : liens manifest + apple-touch-icon + meta iOS standalone.

## Vérification

`npm run build` : plusieurs chunks au lieu d'un, warning 500 kB atténué ou disparu. Manuel : navigation mobile fluide, offline → le shell se recharge, « Ajouter à l'écran d'accueil » propose l'app avec l'icône.
