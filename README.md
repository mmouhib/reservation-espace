# Space Booking (Réservation d'Espace)

Progressive web app (PWA) for booking desks, meeting rooms and coworking spaces. The UI is available in French and English.

**Stack:** Next.js 16 (static export) · React 19 · Tailwind CSS 4 · Firebase (Auth, Firestore, Cloud Functions, Storage, Hosting) · Serwist (service worker) · Vitest.

## Modules and progress

The app is split into **7 modules**. A module is a part of the app that owns its own Firestore collections (the "tables"),
so each of the 7 developers can work on one module without touching the data of the others.

Legend: ✅ done · 🟡 in progress · ⬜ not started

| # | Module | Owns (Firestore collections) | Phase | Status |
|---|---|---|---|---|
| 1 | [**Users**](#1-users) | `users`, `departments`, `teams` | 1 | 🟡 Core done |
| 2 | [**Spaces**](#2-spaces) | `sites`, `spaces` | 2 | ⬜ Model ready |
| 3 | [**Bookings**](#3-bookings) | `bookings`, `absences` (proposed) | 2 | ⬜ Not started |
| 4 | [**Notifications**](#4-notifications) | `users/{uid}/notifications`, `users/{uid}/devices` | 3 | ⬜ Rules ready |
| 5 | [**Credits & Subscriptions**](#5-credits--subscriptions) | `plans`, `subscriptions`, `creditTransactions` (proposed) | 4 | ⬜ Not started |
| 6 | [**Incidents & Equipment**](#6-incidents--equipment) | `incidents`, `equipmentRequests` (proposed) | 5 | ⬜ Not started |
| 7 | [**Analytics & Audit**](#7-analytics--audit) | `auditLogs` (and aggregates, proposed) | 6 | 🟡 Write side done |

Collections marked "proposed" do not exist in the code yet; their names are a suggestion.

### 1. Users

Owns `users`, `departments`, `teams`. Status: 🟡 core done.

- ✅ Google / company SSO sign-in (OIDC, SAML), email-domain restriction, first-admin bootstrap, demo accounts.
- ✅ Roles: `user` < `manager` < `admin`.
- ✅ Admin user list: role filter, pagination, change role.
- ✅ Directory sync that disables departed employees (scheduled or manual).
- ✅ Profile: display name, notification preferences, language (FR/EN).
- ⬜ Departments and teams admin screens.
- ⬜ Manager view of their team.
- ⬜ Account anonymization / deletion and personal data export.

### 2. Spaces

Owns `sites`, `spaces`. Status: ⬜ model ready, no screens yet.

- ✅ Data model, security rules and seed data (2 sites, 28 spaces).
- ⬜ Admin CRUD for sites, floors and spaces (desk, open space, meeting room, coworking, phone booth).
- ⬜ Capacity, equipment, tags, opening hours, closures.
- ⬜ Validation rules for space documents.

### 3. Bookings

Owns `bookings` and `absences` (both proposed). Status: ⬜ not started (placeholder pages only).

- ⬜ Availability search by site, capacity, equipment and date.
- ⬜ Book, change and cancel, with no double booking.
- ⬜ My bookings and history, readable offline.
- ⬜ Admin: all bookings, force release, move, absences.
- ⬜ Cancel the future bookings of departed employees.

### 4. Notifications

Owns `users/{uid}/notifications` and `users/{uid}/devices`. Status: ⬜ rules ready.

- ✅ Security rules, and notification preferences on the profile.
- ⬜ Push notifications (FCM).
- ⬜ Emails: confirmation, cancellation, reminder 24 h before, weekly digest.
- ⬜ In-app inbox with read / unread.
- ⬜ Messages sent in the user's language.

### 5. Credits & Subscriptions

Owns `plans`, `subscriptions`, `creditTransactions` (all proposed). Status: ⬜ not started.

- ⬜ Prices and plans, subscriptions.
- ⬜ Credit top-ups, balance and history.
- ⬜ Charge on booking, refund on cancellation.

### 6. Incidents & Equipment

Owns `incidents` and `equipmentRequests` (both proposed). Status: ⬜ not started.

- ⬜ Report an incident with photos (Storage rules to open).
- ⬜ Equipment requests.
- ⬜ Status tracking and admin handling.

### 7. Analytics & Audit

Owns `auditLogs` (and aggregates, proposed). Status: 🟡 write side done.

- ✅ Audit entries written for user creation, role changes and account disabling. Read access is admin-only.
- ⬜ Audit log viewer with filters.
- ⬜ Dashboards: occupancy, usage.
- ⬜ CSV exports.

### Shared platform (not owned by a single module)

Already built and used by every module. Change it through a pull request that the whole team can see.

- **Auth and roles:** the sign-in flow, the `secureCall` wrapper for Cloud Functions (authentication, role check, rate limiting, input validation) and the role helpers in `packages/shared`.
- **Security rules:** `firebase/firestore.rules` is one file. Each module owns its own `match` block.
- **Translations:** `fr.json` and `en.json`. Each module adds its keys under its own namespace.
- **PWA shell:** install prompt, offline support, update message, navigation, page layout.
- **Quality:** typecheck, lint, unit tests, rules tests and GitHub Actions CI.

### Suggested layout for each module

| Part | Where |
|---|---|
| Screens | `apps/web/app/(app)/<module>/` |
| Cloud Functions | `functions/src/<module>/`, exported from `functions/src/index.ts` |
| Types, schemas | `packages/shared/src/` (one file per module) |
| Security rules | one `match` block in `firebase/firestore.rules` |
| Rules tests | `tests/rules/<module>.test.ts` |
| Translations | `packages/shared/src/i18n/{fr,en}.json`, under the module's namespace |
| Demo data | a section in `scripts/seed.ts` |

## Project structure

```
apps/web/          Next.js app (PWA)
functions/         Cloud Functions (Node 22)
packages/shared/   Types, zod schemas, roles, translations (fr.json / en.json)
firebase/          Firestore and Storage rules, indexes
tests/rules/       Security rules tests (emulator)
scripts/           seed.ts (demo data), generate-icons.mjs
```

## Requirements

| Tool | Version | Why |
|---|---|---|
| Node.js | **22 or later** (see `.nvmrc`) | Next.js 16 and Cloud Functions |
| npm | 10 or later (comes with Node 22) | Workspaces |
| Java (JDK) | **21 or later** | Required by the Firestore emulator (firebase-tools 15) |

No Firebase account is needed for development: everything runs on the local emulators.

Check your versions:

```bash
node -v
java -version
```

## Run it locally

### 1. Install the dependencies

```bash
npm install
```

### 2. Create the environment files

```bash
cp apps/web/.env.example apps/web/.env.local
cp functions/.env.example functions/.env.local
```

On Windows (PowerShell):

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item functions/.env.example functions/.env.local
```

The default values work as they are with the emulators. You can change `NEXT_PUBLIC_DEMO_PASSWORD`
(the password of the demo accounts, at least 6 characters).

### 3. Start the emulators and the app

```bash
npm run dev
```

This builds the functions, starts the Firebase emulators and runs the Next.js dev server.
The emulator data is kept in `.emulator-data/` between runs.

| Service | URL |
|---|---|
| App (Next.js) | http://localhost:3000 |
| Emulator UI | http://127.0.0.1:4000 |
| Auth / Firestore / Functions / Storage | ports 9099 / 8080 / 5001 / 9199 |

### 4. Load the demo data

In a second terminal, once the emulators are ready:

```bash
npm run seed
```

This creates 2 sites, 28 spaces, 4 departments, 1 team and 26 users. It is safe to run again.

### 5. Sign in

On http://localhost:3000, use the "Demo accounts" buttons:

| Account | Role |
|---|---|
| `admin@exemple.fr` | Administrator |
| `manager@exemple.fr` | Manager |
| `user@exemple.fr` | Employee |

The password is the value of `NEXT_PUBLIC_DEMO_PASSWORD` in `apps/web/.env.local`.

> The dev server does not include the service worker. To test installation, offline mode or PWA updates,
> use the production build below.

## Try the PWA (production build)

```bash
npm run build
npm run emulators
```

The emulators serve the static build (`apps/web/out`) on **http://localhost:5050**, with the service worker enabled.
After a new `npm run build`, reload the page: the "A new version is available" message appears.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Emulators and dev server |
| `npm run emulators` | Emulators only (data kept in `.emulator-data/`) |
| `npm run emulators:clean` | Emulators with no import or export (empty state) |
| `npm run seed` | Load the demo data into the emulators |
| `npm run build` | Build the functions and the app (`apps/web/out`) |
| `npm run typecheck` | TypeScript check of every workspace |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (shared and functions) |
| `npm run test:rules` | Firestore and Storage rules tests (starts the emulators, needs Java 21) |
| `npm run icons` | Regenerate the PWA icons (`apps/web/public/icons`) |

## Translations

Texts live in `packages/shared/src/i18n/fr.json` (the reference) and `en.json`.
To add a text, add the same key to both files, then use `t("my.key")` from `useI18n()`.
The tests check that both files have exactly the same keys and the same variables.

## Troubleshooting

- **`firebase-tools no longer supports Java version before 21`**: install JDK 21 or later and check `java -version`.
- **Node version error**: use Node 22 (`nvm use` reads `.nvmrc`).
- **Port already in use**: a previous emulator is still running. Stop it, or free ports 4000, 5001, 5050, 8080, 9099 and 9199.
- **On Windows, `next build` fails with `EBUSY`**: no terminal should be open inside `apps/web/out`.
- **A page stays on "Loading…"**: check that the emulators are running and that `NEXT_PUBLIC_USE_EMULATORS=true`.
- **No demo users**: run `npm run seed` while the emulators are running.

## Deployment (overview)

1. Create a Firebase project (Blaze plan, needed for Cloud Functions) and enable Authentication, Firestore and Storage.
2. Fill in `.firebaserc`, `apps/web/.env.local` (values from the Firebase console, `NEXT_PUBLIC_USE_EMULATORS=false`)
   and `functions/.env.<projectId>`.
3. Set `ALLOWED_EMAIL_DOMAINS` and `BOOTSTRAP_ADMIN_EMAILS`, and set `ENFORCE_APP_CHECK=true`.
4. Run `npm run build`, then `npx firebase deploy`.
