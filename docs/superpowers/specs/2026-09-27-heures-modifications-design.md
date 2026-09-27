# Page Heures — 3 modifications

2026-09-27

## Contexte

La page Heures (`src/pages/Heures.jsx` + `src/lib/workDays.js`) permet de saisir ses heures de travail quotidiennement, comparer à un contrat hebdomadaire, et visualiser les écarts sur un graphique. Trois ajustements sont demandés pour correspondre à la réalité du contrat et des habitudes de travail.

## Modification 1 — Contrat 43h par défaut

**Fichier :** `src/lib/workDays.js`

**Changement de code :** La constante par défaut dans `getContractHours()` passe de `39` à `43`.

**Migration localStorage :** Au démarrage du composant `Heures`, si la valeur stockée sous `dlc_contract_hours` est exactement `"39"` (l'ancienne valeur par défaut), on l'écrase automatiquement par `"43"`. Cette migration est one-shot : dès que la valeur n'est plus `"39"`, elle n'est plus touchée.

## Modification 2 — Samedi travaillé dans le template

**Fichier :** `src/lib/workDays.js`

**Changement de code :** `DEFAULT_TEMPLATE[6]` (Samedi, `getDay() === 6`) passe de `[]` à `[{ start: '05:00', end: '10:00' }, { start: '14:00', end: '17:00' }]` — mêmes créneaux que les jours de semaine.

**Migration localStorage :** Au démarrage du composant `Heures`, si le template sauvegardé (`dlc_work_template`) existe et a Samedi = `[]`, on remplace ce seul champ par les horaires type et on resauvegarde. Les autres jours du template ne sont pas touchés.

Les deux migrations (1 et 2) sont déclenchées une seule fois au montage du composant `Heures`, avant le rendu.

## Modification 3 — Saisie des jours futurs

**Fichier :** `src/pages/Heures.jsx`

**Bouton suivant (→) :** Retirer le `disabled={editDate >= today}`. La navigation vers le futur est désormais libre.

**Bande hebdomadaire :** Les cases futures (`isFuture`) deviennent cliquables (`setEditDate(k)` sans condition). Elles affichent toujours `·` quand aucune saisie n'existe, et les heures enregistrées si une saisie anticipée a été faite. Visuellement : bordure en pointillés (`border: '1px dashed var(--hairline-strong)'`) pour les distinguer des jours passés, sans opacité réduite.

**Draft pour les jours futurs :** Le comportement existant est conservé — si aucune entrée n'est sauvegardée, le template pré-remplit le draft (Samedi aura désormais des horaires grâce à la modification 2).

**Validation :** Le bouton "Valider" fonctionne normalement pour les jours futurs. Pas de contrainte ajoutée.

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/lib/workDays.js` | Default 39→43, DEFAULT_TEMPLATE[6] vide→horaires |
| `src/pages/Heures.jsx` | Migrations au montage, déblocage navigation future |
