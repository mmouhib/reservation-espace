# Space Booking (Réservation d'Espace)

Progressive web app (PWA) for booking desks, meeting rooms and coworking spaces. The UI is available in French and English.

**Stack:** Next.js 16 (static export) · React 19 · Tailwind CSS 4 · Firebase (Auth, Cloud Functions, Storage, Hosting) · MongoDB · Serwist (service worker) · Vitest.

## Modules and progress

The app is split into **8 modules**. A module is a part of the app that owns its own collections (the "tables"),
so each developer can work on one module without touching the data of the others.

Legend: ✅ done · 🟡 done, with a limit to know about · ⬜ not started

| # | Module | Owns (collections) | Status |
|---|---|---|---|
| 1 | [**Users**](#1-users) | `users`, `departments`, `teams` | ✅ Done |
| 2 | [**Spaces**](#2-spaces) | `sites`, `spaces` | ✅ Done |
| 3 | [**Bookings**](#3-bookings) | `bookings`, `absences` | ✅ Done |
| 4 | [**Notifications**](#4-notifications) | `users/{uid}/notifications`, `users/{uid}/devices`, `mail` | 🟡 Push and email need a real project |
| 5 | [**Credits & Subscriptions**](#5-credits--subscriptions) | `wallets`, `creditTransactions`, `plans`, `subscriptions` | 🟡 Payment is simulated |
| 6 | [**Incidents & Equipment**](#6-incidents--equipment) | `incidents`, `equipmentRequests` | ✅ Done |
| 7 | [**Analytics & Audit**](#7-analytics--audit) | `auditLogs` | ✅ Done |
| 8 | [**Visitors**](#8-visitors) | `visits` | ✅ Done |

### 1. Users

Owns `users`, `departments`, `teams`. Screens: sign-in, profile, `/admin/utilisateurs`, `/admin/organisation`, `/equipe`.

- ✅ Google / company SSO sign-in (OIDC, SAML), email-domain restriction, first-admin bootstrap, demo accounts.
- ✅ Roles: `user` < `manager` < `admin`. Admin user list with role filter and pagination.
- ✅ Directory sync that disables departed employees and cancels their upcoming bookings.
- ✅ Profile: display name, notification preferences, language (FR/EN), department and teams.
- ✅ Departments and teams administration; users are placed in a department and in teams by an administrator.
- ✅ Manager view of their teams' bookings (`/equipe`).
- ✅ GDPR: export of personal data, deletion of the account (by the user or an administrator).

### 2. Spaces

Owns `sites`, `spaces`. Screen: `/admin/espaces`.

- ✅ Sites with address, time zone, floors and default opening hours.
- ✅ Spaces: desk, open space, meeting room, coworking, phone booth. Capacity, price in credits per hour, equipment, features.
- ✅ Opening hours per space and exceptional closures.
- ✅ Validation of every space document in the security rules.

### 3. Bookings

Owns `bookings` and `absences`. Screens: `/reserver`, `/mes-reservations`, `/admin/reservations`.

- ✅ Availability search by site, date, time slot and number of people, with filters on type, capacity and equipment.
- ✅ Booking with no double booking (checked in a transaction): desks and rooms are booked whole, open spaces and coworking seat by seat.
- ✅ Rules: 30 minute slots, 8 hours maximum, opening hours, closures, 60 days ahead, no overlap for one user.
- ✅ My bookings (upcoming and past), change and cancel, readable offline.
- ✅ Absences: declaring one cancels and refunds the bookings inside it and blocks new ones.
- ✅ Admin: all bookings by period, force release with a reason, move to another space or time.
- 🟡 Not included: recurring bookings and waiting lists.

### 4. Notifications

Owns `users/{uid}/notifications`, `users/{uid}/devices` and the `mail` queue. Screen: `/notifications` (bell in the header).

- ✅ In-app inbox with read / unread, written in the user's language.
- ✅ Sent for: booking confirmed, cancelled, moved, 24 h reminder, weekly digest, credits added, subscription renewed, incident updates.
- 🟡 Push (FCM): code and device registration are in place, but FCM is not emulated, so it needs a real Firebase project with a VAPID key.
- 🟡 Email: messages are written to the `mail` collection, which the Firebase "Trigger Email" extension sends. Install and configure the extension to send them.

### 5. Credits & Subscriptions

Owns `wallets`, `creditTransactions`, `plans`, `subscriptions`. Screens: `/credits`, `/admin/credits`.

- ✅ Balance and full history. Bookings are charged, cancellations and changes are refunded or charged the difference.
- ✅ Plans: credit packs and monthly subscriptions, created and priced by an administrator.
- ✅ Subscriptions renew every month (scheduled function) and can be cancelled.
- ✅ Administrators adjust balances. Optional welcome credits for new accounts (`WELCOME_CREDITS`).
- 🟡 Payment is simulated: connect a payment provider in `functions/src/credits/credits.ts` before charging real money.

### 6. Incidents & Equipment

Owns `incidents`, `equipmentRequests`. Screens: `/support`, `/admin/support`.

- ✅ Report an incident with up to 3 photos (Storage), optionally linked to a space.
- ✅ Equipment requests (item, quantity, date needed).
- ✅ Administrators set the status and answer; the requester is notified.

### 7. Analytics & Audit

Owns `auditLogs`. Screens: `/admin/statistiques`, `/admin/audit`.

- ✅ Audit entries for bookings, absences, credits, subscriptions and user changes (role, organization, deletion).
- ✅ Audit log viewer with an action filter.
- ✅ Statistics over a period: bookings, cancellations, hours booked, credits spent, active users, per day, per space type, most booked spaces.
- ✅ CSV export of the bookings of the period.

### 8. Visitors

Owns `visits`. Screens: `/visiteurs`, `/admin/visiteurs`.

- ✅ Invite an external guest to a site and a date; any employee can be a host.
- ✅ Reception view of a day's expected guests, with check-in and check-out.
- ✅ The host is notified in-app the moment their guest checks in.
- ✅ Cancelling an invite before the visit, by the host or an administrator.
- ✅ Authorization is enforced entirely in the callables (`functions/src/visitors/visits.ts`): the role check of
  `secureCall` and ownership checks (a host sees only their own invites; check-in and check-out are for administrators).

### Shared platform (not owned by a single module)

Already built and used by every module. Change it through a pull request that the whole team can see.

- **Auth and roles:** the sign-in flow, the `secureCall` wrapper for Cloud Functions (authentication, role check, rate limiting, input validation) and the role helpers in `packages/shared`.
- **Access control:** done in the Cloud Functions, not in the database. `secureCall` requires a company role on every function (at least `user`), and each function checks what the caller may touch.
- **Translations:** `fr.json` and `en.json`. Each module adds its keys under its own namespace.
- **PWA shell:** install prompt, offline support, update message, navigation, page layout.
- **Quality:** typecheck, lint, unit tests, API tests and GitHub Actions CI.

### Suggested layout for each module

| Part | Where |
|---|---|
| Screens | `apps/web/app/(app)/<module>/` |
| Cloud Functions | `functions/src/<module>/`, exported from `functions/src/index.ts` |
| Types, schemas | `packages/shared/src/` (one file per module) |
| Access control | the role and ownership checks of the module's functions |
| API tests | `tests/api/`: call the module's functions as real users |
| Translations | `packages/shared/src/i18n/{fr,en}.json`, under the module's namespace |
| Demo data | a section in `scripts/seed.ts` |

## Project structure

```
apps/web/          Next.js app (PWA)
functions/         Cloud Functions (Node 22)
packages/shared/   Types, zod schemas, roles, translations (fr.json / en.json)
firebase/          Storage rules (incident photos)
tests/api/         Cloud Functions tests (emulators and MongoDB)
scripts/           seed.ts (demo data), generate-icons.mjs
```

## Requirements

| Tool | Version | Why |
|---|---|---|
| Node.js | **22 or later** (see `.nvmrc`) | Next.js 16 and Cloud Functions |
| npm | 10 or later (comes with Node 22) | Workspaces |
| Java (JDK) | **21 or later** | Required by the Storage emulator (firebase-tools 15) |
| MongoDB | a replica set: **Docker** (local) or a **MongoDB Atlas** cluster | All the data lives in MongoDB, and its transactions need a replica set |

No Firebase account is needed for development: sign-in, the Cloud Functions and the file storage run on the local
Firebase emulators. The data is stored in MongoDB: Docker Compose starts a local one-node replica set, or you can
point the app at an Atlas cluster.

Check your versions:

```bash
node -v
java -version
docker --version   # only for the local MongoDB
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

`functions/.env.local` holds `MONGODB_URI`. The default points at the local Docker MongoDB. To use Atlas instead, put its
connection string there and add `MONGODB_DB_NAME=reservation_dev`, so that the demo data goes into a development
database and never into the production one. You can also change `NEXT_PUBLIC_DEMO_PASSWORD` in `apps/web/.env.local`
(the password of the demo accounts, at least 6 characters).

### 3. Start MongoDB, the emulators and the app

With Docker:

```bash
npm run dev
```

This starts MongoDB with Docker Compose, builds the functions, starts the Firebase emulators and runs the Next.js dev
server. The emulator data (the demo sign-in accounts) is kept in `.emulator-data/` between runs.

With Atlas, without Docker, in two terminals:

```bash
npm run build -w functions
npx cross-env FUNCTIONS_DISCOVERY_TIMEOUT=60 firebase emulators:start
```

```bash
npm run dev -w apps/web
```

| Service | URL |
|---|---|
| App (Next.js) | http://localhost:3000 |
| Emulator UI | http://127.0.0.1:4000 |
| Auth / Functions / Storage | ports 9099 / 5001 / 9199 |
| MongoDB (Docker) | port 27017 |

### 4. Create the indexes and load the demo data

In a second terminal, once the emulators are ready:

```bash
npm run mongo:init-indexes
npm run seed
```

The first command creates the indexes the queries rely on (MongoDB does not create them by itself). The second creates
the demo sign-in accounts in the Auth emulator and writes 2 sites, 28 spaces, 4 departments, 1 team, 26 users and some
bookings, credits and support requests into the database of `MONGODB_URI`. Both are safe to run again.
Never run the seed against a production database.

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
Without Docker, start the emulators with the `firebase emulators:start` command of step 3 instead of `npm run emulators`.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Local MongoDB (Docker), emulators and dev server |
| `npm run emulators` | Local MongoDB (Docker) and emulators (sign-in accounts kept in `.emulator-data/`) |
| `npm run emulators:clean` | The same, with no import or export of the emulator data |
| `npm run mongo:up` / `mongo:down` | Start / stop the local MongoDB (Docker Compose, one-node replica set) |
| `npm run mongo:init-indexes` | Create the MongoDB indexes (run once per database, including Atlas) |
| `npm run seed` | Load the demo accounts and data |
| `npm run build` | Build the functions and the app (`apps/web/out`) |
| `npm run typecheck` | TypeScript check of every workspace |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (shared and functions) |
| `npm run test:api` | Cloud Functions tests: starts MongoDB (Docker) and the emulators, seeds a `reservation_test` database and calls the functions as real users |
| `npm run icons` | Regenerate the PWA icons (`apps/web/public/icons`) |

## Translations

Texts live in `packages/shared/src/i18n/fr.json` (the reference) and `en.json`.
To add a text, add the same key to both files, then use `t("my.key")` from `useI18n()`.
The tests check that both files have exactly the same keys and the same variables.

## Troubleshooting

- **`firebase-tools no longer supports Java version before 21`**: the Storage emulator needs JDK 21 or later. Check `java -version`.
- **Node version error**: use Node 22 (`nvm use` reads `.nvmrc`).
- **`docker` is not found when running `npm run dev`**: install Docker, or use MongoDB Atlas and the two-terminal start of step 3.
- **`MONGODB_URI is not set`**: add it to `functions/.env.local` (the example file has the local Docker value).
- **Port already in use**: a previous emulator is still running. Stop it, or free ports 4000, 5001, 5050, 9099 and 9199.
- **On Windows, `next build` fails with `EBUSY`**: no terminal should be open inside `apps/web/out`.
- **A page stays on "Loading…"**: check that the emulators are running and that `NEXT_PUBLIC_USE_EMULATORS=true`.
- **No demo users, or empty screens**: run `npm run mongo:init-indexes` and `npm run seed` while the emulators are running.
- **Connection refused or timeout with Atlas**: your IP address must be allowed in Atlas under Network Access.

## Deployment (overview)

1. Create a Firebase project (Blaze plan, needed for Cloud Functions) and enable Authentication and Storage.
2. Create a MongoDB Atlas cluster (a replica set), a database user, and allow the Cloud Functions to connect
   (Network Access). Run `npm run mongo:init-indexes` once with `MONGODB_URI` pointing at it.
3. Set the three secrets, which every function needs before it can be deployed:
   `firebase functions:secrets:set MONGODB_URI`, `RESEND_API_KEY` and `GOOGLE_GENERATIVE_AI_API_KEY`.
4. Fill in `.firebaserc`, `apps/web/.env.local` (values from the Firebase console, `NEXT_PUBLIC_USE_EMULATORS=false`)
   and `functions/.env.<projectId>`.
5. Set `ALLOWED_EMAIL_DOMAINS` and `BOOTSTRAP_ADMIN_EMAILS`, and set `ENFORCE_APP_CHECK=true`.
6. Run `npm run build`, then `npx firebase deploy`.
