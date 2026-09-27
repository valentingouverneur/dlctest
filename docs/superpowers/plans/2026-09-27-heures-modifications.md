# Page Heures — 3 modifications — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Passer le contrat à 43h par défaut, marquer le samedi comme jour travaillé dans le template, et autoriser la saisie anticipée des jours futurs.

**Architecture:** Deux fichiers touchés. `workDays.js` reçoit les changements de constantes (default 39→43, template samedi). `Heures.jsx` reçoit les migrations localStorage (lazy initializers des useState) et le déblocage de la navigation future.

**Tech Stack:** React 18, Vite, localStorage, inline styles (pas de test runner — vérification manuelle en navigateur sur `http://localhost:5173`).

## Global Constraints

- Pas de TypeScript — JavaScript uniquement
- Pas de librairie de test — vérification manuelle en navigateur
- Inline styles uniquement (pas de classes CSS nouvelles)
- Les migrations localStorage sont one-shot et ne touchent que les valeurs qui correspondent exactement aux anciennes valeurs par défaut
- Aucune régression sur la saisie des jours passés

---

### Task 1 : workDays.js — contrat 43h + template samedi

**Files:**
- Modify: `src/lib/workDays.js:158-166` (DEFAULT_TEMPLATE)
- Modify: `src/lib/workDays.js:181-183` (getContractHours)

**Interfaces:**
- Produit: `DEFAULT_TEMPLATE[6]` non vide, `getContractHours()` retourne `43` par défaut
- Consommé par Task 2 (migrations dans Heures.jsx)

- [ ] **Step 1 : Modifier DEFAULT_TEMPLATE**

Dans `src/lib/workDays.js`, remplacer les lignes 158-166 :

```js
const DEFAULT_TEMPLATE = {
  0: [],
  1: [{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }],
  2: [{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }],
  3: [{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }],
  4: [{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }],
  5: [{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }],
  6: [{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }],
};
```

(Samedi = `6` passe de `[]` à deux créneaux identiques aux autres jours.)

- [ ] **Step 2 : Modifier getContractHours**

Dans `src/lib/workDays.js`, remplacer la ligne 182 :

```js
export function getContractHours() {
  const v = parseFloat(localStorage.getItem(CONTRACT_KEY));
  return Number.isFinite(v) && v > 0 ? v : 43;
}
```

(`39` → `43` sur la dernière ligne de la fonction.)

- [ ] **Step 3 : Vérification manuelle**

Lancer `npm run dev`, ouvrir `http://localhost:5173`, naviguer vers Heures.

Dans DevTools → Application → Local Storage, supprimer les clés `dlc_contract_hours` et `dlc_work_template` pour simuler un nouvel utilisateur.

Recharger la page. Ouvrir "Journée type & contrat" dans les réglages.

Attendu :
- Le champ "Heures contractuelles" affiche `43`
- La ligne Samedi (Sam) affiche `05:00 – 10:00` et `14:00 – 17:00` avec `8h` en total

- [ ] **Step 4 : Commit**

```bash
git add src/lib/workDays.js
git commit -m "feat: contrat 43h par defaut, samedi travaille dans le template"
```

---

### Task 2 : Heures.jsx — migrations localStorage + navigation future

**Files:**
- Modify: `src/pages/Heures.jsx:64-65` (useState contract + template)
- Modify: `src/pages/Heures.jsx:248-255` (bouton suivant →)
- Modify: `src/pages/Heures.jsx:267-281` (bande hebdomadaire — strip days)

**Interfaces:**
- Consomme: `DEFAULT_TEMPLATE`, `getContractHours`, `getTemplate`, `saveTemplate`, `saveContractHours` de `workDays.js` (inchangés)

- [ ] **Step 1 : Ajouter les migrations dans les lazy initializers**

Dans `src/pages/Heures.jsx`, remplacer les lignes 64-65 :

```js
const [contract, setContract] = useState(getContractHours);
const [template, setTemplate] = useState(getTemplate);
```

Par :

```js
const [contract, setContract] = useState(() => {
  const stored = localStorage.getItem('dlc_contract_hours');
  if (stored === '39') saveContractHours(43);
  return getContractHours();
});

const [template, setTemplate] = useState(() => {
  try {
    const raw = localStorage.getItem('dlc_work_template');
    if (raw) {
      const tpl = JSON.parse(raw);
      if (Array.isArray(tpl[6]) && tpl[6].length === 0) {
        tpl[6] = [{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }];
        saveTemplate(tpl);
      }
    }
  } catch {}
  return getTemplate();
});
```

Les migrations tournent exactement une fois (lazy initializer React), avant le premier rendu.

- [ ] **Step 2 : Vérifier que saveContractHours est bien importé**

En haut de `Heures.jsx`, la ligne d'import doit contenir `saveContractHours` et `saveTemplate` :

```js
import {
  listWorkDays, upsertWorkDay, deleteWorkDay,
  parseHM, segMinutes, dayMinutes, fmtHM, fmtDelta,
  toDayKey, fromDayKey, addDays, mondayOf, isoWeekOf, groupWeeks,
  getTemplate, saveTemplate, getContractHours, saveContractHours,
} from '../lib/workDays';
```

(Ces deux fonctions sont déjà importées — vérifier visuellement, ne rien changer si c'est le cas.)

- [ ] **Step 3 : Débloquer le bouton suivant (→)**

Dans `src/pages/Heures.jsx`, remplacer le bouton "→" (autour de la ligne 248) :

```jsx
<button
  onClick={() => setEditDate(d => addDays(d, 1))}
  className="btn btn-ghost"
  style={{ width: 32, height: 32, padding: 0, justifyContent: 'center' }}
>
  <Icon.ChevronRight s={14} c="var(--charcoal)"/>
</button>
```

(Supprimer `disabled={editDate >= today}` et `opacity: editDate >= today ? 0.35 : 1` du style.)

- [ ] **Step 4 : Rendre les jours futurs cliquables dans la bande**

Dans `src/pages/Heures.jsx`, remplacer le `<button>` de la bande hebdomadaire (autour de la ligne 267) :

```jsx
<button key={k} onClick={() => setEditDate(k)}
  style={{
    flex: 1, height: 46, borderRadius: 8, cursor: 'pointer',
    border: isEdit
      ? '1.5px solid var(--primary)'
      : isFuture
        ? '1px dashed var(--hairline-strong)'
        : '0.5px solid var(--hairline)',
    background: state === 'worked' ? 'var(--tint-lavender)' : 'var(--canvas)',
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
    opacity: 1, padding: 0, fontFamily: 'inherit',
  }}
>
```

Changements vs code existant :
- `onClick` : suppression de `!isFuture &&`
- `cursor` : toujours `'pointer'` (plus de `isFuture ? 'default' : 'pointer'`)
- `border` : ternaire à 3 niveaux (sélectionné → pointillé si futur → trait normal)
- `opacity` : fixé à `1` (suppression de `isFuture ? 0.4 : 1`)

- [ ] **Step 5 : Vérification manuelle — migrations**

Avec `dlc_contract_hours = "39"` en localStorage (ne pas le supprimer, laisser `"39"`), recharger la page Heures.

Attendu :
- Le KPI "Cette semaine" affiche `vs 43h` au lieu de `vs 39h`
- Le graphique a sa ligne pointillée repositionnée à 43h
- Dans les réglages, le champ contrat affiche `43`
- En DevTools, `dlc_contract_hours` vaut maintenant `"43"`

- [ ] **Step 6 : Vérification manuelle — navigation future**

Depuis aujourd'hui (dimanche 27 sept), cliquer plusieurs fois sur le bouton → pour aller sur lundi 28, mardi 29, etc.

Attendu :
- Le bouton → reste actif indéfiniment
- Les jours futurs dans la bande hebdomadaire ont une bordure en pointillés
- Cliquer sur un jour futur dans la bande le sélectionne
- Le draft se pré-remplit avec le template du jour (ex: lundi → `05:00–10:00, 14:00–17:00`)
- Sauvegarder un jour futur fonctionne (bouton "Valider · Xh" actif)
- Après sauvegarde, la case du jour futur dans la bande affiche ses heures

- [ ] **Step 7 : Vérification manuelle — samedi migration**

Avec `dlc_work_template` en localStorage contenant `"6":[]`, recharger la page.

Attendu :
- Naviguer jusqu'au prochain samedi : le draft se pré-remplit avec `05:00–10:00` et `14:00–17:00`
- En DevTools, `dlc_work_template` a maintenant `"6":[{"start":"05:00","end":"10:00"},{"start":"14:00","end":"17:00"}]`

- [ ] **Step 8 : Commit**

```bash
git add src/pages/Heures.jsx
git commit -m "feat: migrations localStorage 43h/samedi, saisie jours futurs debloquee"
```
