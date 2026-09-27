# Authentification Google OAuth

2026-09-27

## Contexte

L'app DLC est actuellement en accès libre — toutes les tables Supabase acceptent les requêtes anonymes (`anon`). Le schéma SQL contient déjà le commentaire prévu : *"Tighten these policies when user accounts/roles are added."* L'objectif est de protéger l'ensemble des données derrière un login Google, en restant compatible avec un futur passage multi-utilisateurs.

## Approche retenue

**Google OAuth via Supabase Auth.** Tous les utilisateurs (actuellement toi seul, demain des collègues) se connectent avec leur compte Google d'entreprise. Supabase gère la session côté client (localStorage). Aucun mot de passe à gérer.

## Architecture

### Nouveaux fichiers

**`src/lib/auth.js`**
Helpers auth : `signInWithGoogle()`, `signOut()`, `getSession()`, `onAuthChange(callback)`. Wrappent les appels Supabase Auth pour isoler la dépendance.

**`src/hooks/useAuth.js`**
Hook React qui écoute `onAuthChange` et expose `{ user, loading }`. Utilisé par le guard de route et la sidebar (affichage du bouton déconnexion).

**`src/pages/Login.jsx`**
Page plein écran : logo DLC + bouton "Se connecter avec Google". Utilise le flow redirect (pas popup) pour compatibilité mobile. Après authentification, Supabase redirige vers l'app et la session est restaurée automatiquement.

### Fichiers modifiés

**`src/App.jsx`**
Wrap toutes les routes dans un guard auth : si `loading` → spinner, si `!user` → redirect vers `/login`, sinon → render normal. La route `/login` est la seule accessible sans session.

**`src/App.jsx`** (même fichier que le guard)
Ajout de la route `/login` pointant vers `Login.jsx`.

**`src/pages/DesktopShell.jsx`**
Bouton "Se déconnecter" dans la sidebar (en bas, à côté du compte actif).

**`supabase/auth-rls.sql`** (nouveau fichier dans `supabase/`)
Mise à jour de toutes les RLS : remplace `to anon, authenticated` par `to authenticated` sur les 5 tables (`products`, `scans`, `dlc_items`, `work_days`, `analyses`). Les requêtes anonymes sont bloquées côté base de données.

## Flow utilisateur

1. Utilisateur ouvre l'app → `useAuth` vérifie la session
2. Pas de session → redirect automatique vers `/login`
3. Clic "Se connecter avec Google" → redirect OAuth Google → retour sur l'app
4. Session active → accès normal à toutes les pages
5. Bouton "Se déconnecter" → `signOut()` → redirect vers `/login`

La session persiste entre rechargements (Supabase la stocke en localStorage). Sur mobile, le flow redirect évite les problèmes de popup bloqués.

## Prérequis Supabase (configuration manuelle)

Avant de déployer, dans le dashboard Supabase :
1. Authentication → Providers → Google → activer, saisir `Client ID` et `Client Secret` Google OAuth
2. Authentication → URL Configuration → ajouter `https://dlcscan.vercel.app` aux Redirect URLs
3. (Optionnel) Authentication → Settings → restreindre les domaines autorisés à l'adresse email d'entreprise pour empêcher toute connexion externe

## Future-proofing multi-utilisateurs

Quand des collègues rejoindront la plateforme :
- `scans`, `work_days`, `analyses` recevront une colonne `user_id uuid references auth.users(id)`
- Les RLS passeront de `using (true)` à `using (auth.uid() = user_id)`
- `products` (catalogue produits) restera partagé entre tous les utilisateurs
- Aucun changement nécessaire dans `auth.js` ou `useAuth.js`

## Fichiers impactés

| Fichier | Action |
|---|---|
| `src/lib/auth.js` | Créer |
| `src/hooks/useAuth.js` | Créer |
| `src/pages/Login.jsx` | Créer |
| `src/App.jsx` | Modifier — guard auth + route `/login` |
| `src/pages/DesktopShell.jsx` | Modifier — bouton déconnexion sidebar |
| `supabase/auth-rls.sql` | Créer — nouvelles policies RLS |
