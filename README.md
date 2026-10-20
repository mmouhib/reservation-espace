# Réservation d'Espace

Application web progressive (PWA) de réservation de postes, de salles de réunion et d'espaces de coworking.
Disponible en français et en anglais.

**Stack :** Next.js 16 (export statique) · React 19 · Tailwind CSS 4 · Firebase (Auth, Firestore, Cloud Functions, Storage, Hosting) · Serwist (service worker) · Vitest.

## Fonctionnalités actuelles (phase 1)

- Connexion Google ou SSO d'entreprise (OIDC/SAML), avec comptes de démonstration en local.
- Rôles `user` < `manager` < `admin`, gestion des utilisateurs (liste, filtre, changement de rôle), synchronisation de l'annuaire.
- Profil : nom affiché, préférences de notification, langue (FR/EN).
- PWA installable et utilisable hors ligne, avec message « Nouvelle version disponible ».
- Règles Firestore « refus par défaut », limitation de débit des fonctions, journal d'audit.

Les réservations, la gestion des espaces, les notifications, les crédits, les signalements et les tableaux de bord arrivent dans les phases 2 à 6.

## Structure

```
apps/web/          Application Next.js (PWA)
functions/         Cloud Functions (Node 22)
packages/shared/   Types, schémas zod, rôles, traductions (fr.json / en.json)
firebase/          Règles Firestore et Storage, index
tests/rules/       Tests des règles de sécurité (émulateur)
scripts/           seed.ts (données de démo), generate-icons.mjs
```

## Prérequis

| Outil | Version | Pourquoi |
|---|---|---|
| Node.js | **22 ou plus** (voir `.nvmrc`) | Next.js 16 et Cloud Functions |
| npm | 10 ou plus (fourni avec Node 22) | Workspaces |
| Java (JDK) | **21 ou plus** | Requis par l'émulateur Firestore (firebase-tools 15) |

Aucun compte Firebase n'est nécessaire pour développer : tout tourne sur les émulateurs locaux.

Vérifier les versions :

```bash
node -v
java -version
```

## Lancer en local

### 1. Installer les dépendances

```bash
npm install
```

### 2. Créer les fichiers d'environnement

```bash
cp apps/web/.env.example apps/web/.env.local
cp functions/.env.example functions/.env.local
```

Sous Windows (PowerShell) :

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item functions/.env.example functions/.env.local
```

Les valeurs par défaut fonctionnent telles quelles avec les émulateurs. Vous pouvez changer
`NEXT_PUBLIC_DEMO_PASSWORD` (mot de passe des comptes de démonstration, 6 caractères minimum).

### 3. Démarrer les émulateurs et l'application

```bash
npm run dev
```

Cette commande compile les fonctions, démarre les émulateurs Firebase et lance le serveur Next.js.
Les données des émulateurs sont conservées dans `.emulator-data/` entre deux exécutions.

| Service | URL |
|---|---|
| Application (Next.js) | http://localhost:3000 |
| Interface des émulateurs | http://127.0.0.1:4000 |
| Auth / Firestore / Functions / Storage | 9099 / 8080 / 5001 / 9199 |

### 4. Charger les données de démonstration

Dans un second terminal, une fois les émulateurs prêts :

```bash
npm run seed
```

Le script crée 2 sites, 28 espaces, 4 départements, 1 équipe et 26 utilisateurs (il peut être relancé sans risque).

### 5. Se connecter

Sur http://localhost:3000, utilisez les boutons « Comptes de démonstration » :

| Compte | Rôle |
|---|---|
| `admin@exemple.fr` | Administrateur |
| `manager@exemple.fr` | Manager |
| `user@exemple.fr` | Collaborateur |

Le mot de passe est la valeur de `NEXT_PUBLIC_DEMO_PASSWORD` dans `apps/web/.env.local`.

> Le serveur de développement n'inclut pas le service worker : pour tester l'installation, le mode hors ligne
> ou les mises à jour de la PWA, utilisez la version de production ci-dessous.

## Tester la PWA (build de production)

```bash
npm run build
npm run emulators
```

Les émulateurs servent le build statique (`apps/web/out`) sur **http://localhost:5050**, avec le service worker actif.
Après un nouveau `npm run build`, rechargez la page : le message « Nouvelle version disponible » apparaît.

## Commandes utiles

| Commande | Rôle |
|---|---|
| `npm run dev` | Émulateurs + serveur de développement |
| `npm run emulators` | Émulateurs seuls (données conservées dans `.emulator-data/`) |
| `npm run emulators:clean` | Émulateurs sans import ni export (état vierge) |
| `npm run seed` | Charge les données de démo dans les émulateurs |
| `npm run build` | Compile les fonctions et l'application (`apps/web/out`) |
| `npm run typecheck` | Vérification TypeScript de tous les workspaces |
| `npm run lint` | ESLint |
| `npm test` | Tests unitaires (shared et functions) |
| `npm run test:rules` | Tests des règles Firestore/Storage (démarre les émulateurs, Java 21 requis) |
| `npm run icons` | Régénère les icônes de la PWA (`apps/web/public/icons`) |

## Traductions

Les textes sont dans `packages/shared/src/i18n/fr.json` (référence) et `en.json`.
Pour ajouter un texte, ajoutez la même clé dans les deux fichiers, puis utilisez `t("ma.cle")` via `useI18n()`.
Les tests vérifient que les deux fichiers ont exactement les mêmes clés et les mêmes variables.

## Dépannage

- **`firebase-tools no longer supports Java version before 21`** : installez un JDK 21 ou plus et vérifiez `java -version`.
- **Erreur de version de Node** : utilisez Node 22 (`nvm use` lit `.nvmrc`).
- **Port déjà utilisé** : un émulateur précédent tourne encore. Arrêtez-le ou libérez les ports 4000, 5001, 5050, 8080, 9099 et 9199.
- **Sous Windows, `next build` échoue avec `EBUSY`** : aucun terminal ne doit être ouvert dans `apps/web/out`.
- **La page reste sur « Chargement… »** : vérifiez que les émulateurs tournent et que `NEXT_PUBLIC_USE_EMULATORS=true`.
- **Aucun utilisateur de démo** : lancez `npm run seed` pendant que les émulateurs sont démarrés.

## Déploiement (aperçu)

1. Créez un projet Firebase (plan Blaze, nécessaire pour les Cloud Functions) et activez Authentication, Firestore et Storage.
2. Renseignez `.firebaserc`, `apps/web/.env.local` (valeurs de la console Firebase, `NEXT_PUBLIC_USE_EMULATORS=false`) et `functions/.env.<projectId>`.
3. Définissez `ALLOWED_EMAIL_DOMAINS` et `BOOTSTRAP_ADMIN_EMAILS`, et mettez `ENFORCE_APP_CHECK=true`.
4. `npm run build`, puis `npx firebase deploy`.

---

## English summary

Progressive web app for booking desks, meeting rooms and coworking spaces (French and English UI).

**Requirements:** Node.js 22+, Java 21+ (for the Firestore emulator). No Firebase account needed for local development.

```bash
npm install
cp apps/web/.env.example apps/web/.env.local
cp functions/.env.example functions/.env.local
npm run dev          # emulators + Next.js on http://localhost:3000
npm run seed         # in a second terminal: demo data
```

Sign in with a demo account (`admin@exemple.fr`, `manager@exemple.fr` or `user@exemple.fr`; the password is
`NEXT_PUBLIC_DEMO_PASSWORD` from `apps/web/.env.local`). To try the installable/offline PWA, run
`npm run build && npm run emulators` and open http://localhost:5050. Run the checks with `npm run typecheck`,
`npm run lint`, `npm test` and `npm run test:rules`.
