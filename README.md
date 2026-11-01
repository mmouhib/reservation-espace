# Space Booking (Réservation d'Espace)

Progressive web app (PWA) for booking desks, meeting rooms and coworking spaces. The UI is available in French and English.

**Stack:** Next.js 16 (static export) · React 19 · Tailwind CSS 4 · Node server (Express) · MongoDB (data and photos) · Firebase Auth (Google sign-in only) · Serwist (service worker) · Vitest.

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

- ✅ Google sign-in for everyone: a Google account is always a regular `user`, with an optional email-domain restriction. Demo accounts for development.
- ✅ Administrators are created apart from Google, with `npm run create-admin` (email and password). An admin can make a user a `manager` from the Users screen, but not an admin.
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

Owns the `notifications` and `devices` collections. Screen: `/notifications` (bell in the header).

- ✅ In-app inbox with read / unread, written in the user's language.
- ✅ Sent for: booking confirmed, cancelled, moved, 24 h reminder, weekly digest, credits added, subscription renewed, incident updates.
- 🟡 Push (Web Push): the server sends it with VAPID keys and the service worker shows it. It needs HTTPS and a real browser, so it is not tested automatically. On iPhone the app must be installed first.
- ✅ Email through Resend (set `RESEND_API_KEY`; without it, emails are skipped).
- ✅ The reminders (every hour) and the weekly digest (Monday 07:00) run inside the server.

### 5. Credits & Subscriptions

Owns `wallets`, `creditTransactions`, `plans`, `subscriptions`. Screens: `/credits`, `/admin/credits`.

- ✅ Balance and full history. Bookings are charged, cancellations and changes are refunded or charged the difference.
- ✅ Plans: credit packs and monthly subscriptions, created and priced by an administrator.
- ✅ Subscriptions renew every month (scheduled function) and can be cancelled.
- ✅ Administrators adjust balances. Optional welcome credits for new accounts (`WELCOME_CREDITS`).
- 🟡 Payment is simulated: connect a payment provider in `server/src/credits/credits.ts` before charging real money.

### 6. Incidents & Equipment

Owns `incidents`, `equipmentRequests`. Screens: `/support`, `/admin/support`.

- ✅ Report an incident with up to 3 photos (stored in MongoDB), optionally linked to a space.
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
- ✅ Authorization is enforced entirely in the callables (`server/src/visitors/visits.ts`): the role check of
  `secureCall` and ownership checks (a host sees only their own invites; check-in and check-out are for administrators).

### Shared platform (not owned by a single module)

Already built and used by every module. Change it through a pull request that the whole team can see.

- **Auth and roles:** the sign-in flow, the `secureCall` wrapper of the server's endpoints (authentication, role check, rate limiting, input validation) and the role helpers in `packages/shared`.
- **Access control:** done in the server, not in the database. `secureCall` requires a company role on every endpoint (at least `user`), and each endpoint checks what the caller may touch.
- **Translations:** `fr.json` and `en.json`. Each module adds its keys under its own namespace.
- **PWA shell:** install prompt, offline support, update message, navigation, page layout.
- **Quality:** typecheck, lint, unit tests, API tests and GitHub Actions CI.

### Suggested layout for each module

| Part | Where |
|---|---|
| Screens | `apps/web/app/(app)/<module>/` |
| Server endpoints | `server/src/<module>/`, exported from `server/src/endpoints.ts` |
| Types, schemas | `packages/shared/src/` (one file per module) |
| Access control | the role and ownership checks of the module's endpoints |
| API tests | `tests/api/`: call the module's endpoints as real users |
| Translations | `packages/shared/src/i18n/{fr,en}.json`, under the module's namespace |
| Demo data | a section in `scripts/seed.ts` |

## Project structure

```
apps/web/          Next.js app (PWA)
server/            Node server: the API (`/api/<name>`), the scheduled jobs and the web app's files
packages/shared/   Types, zod schemas, roles, translations (fr.json / en.json)
tests/api/         API tests (the built server, the Auth emulator and MongoDB)
scripts/           seed.ts (demo data), production-check.mjs, generate-icons.mjs
```

## How it fits together

```
 browser (PWA) ──► Node server ──► MongoDB (data, incident photos)
      │               │   ├─ serves the web app (apps/web/out)
      │               │   ├─ POST /api/<name>  (74 endpoints)
      │               │   └─ scheduled jobs (reminders, weekly digest, renewals, directory sync)
      └─ Google sign-in ──► Firebase Auth (the only Firebase service used)
```

The browser signs in with Google through Firebase Auth (administrators use an email and a password) and sends the
Firebase ID token with every request. The server checks the token, reads the person's role from it and does everything
else itself. A Google account gets the role `user` on its first sign-in, never more; an account without a role can do nothing. Firebase stores nothing else: the
profile, bookings, credits and photos are in MongoDB.

## Requirements

| Tool | Version | Why |
|---|---|---|
| Node.js | **22 or later** (see `.nvmrc`) | Next.js 16 and the server |
| npm | 10 or later (comes with Node 22) | Workspaces |
| MongoDB | a replica set: **Docker** (local) or a **MongoDB Atlas** cluster | All the data lives in MongoDB, and its transactions need a replica set |

No Firebase account is needed for development: sign-in runs on the local Firebase Auth emulator (it needs no Java).

```bash
node -v
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
cp server/.env.example server/.env.local
```

On Windows (PowerShell):

```powershell
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item server/.env.example server/.env.local
```

`server/.env.local` holds `MONGODB_URI`. The default points at the local Docker MongoDB. To use Atlas instead, put its
connection string there and add `MONGODB_DB_NAME=reservation_dev`, so that the demo data goes into a development
database and never into the production one. You can also change `NEXT_PUBLIC_DEMO_PASSWORD` in `apps/web/.env.local`
(the password of the demo accounts, at least 6 characters). Both files explain every setting.

### 3. Start MongoDB and the app

With Docker:

```bash
npm run dev:docker
```

With Atlas, or a MongoDB you already run:

```bash
npm run dev
```

This starts the Firebase Auth emulator, the server (restarts when you change a file) and the Next.js dev server.
The emulator data (the demo sign-in accounts) is kept in `.emulator-data/` between runs.

| Service | URL |
|---|---|
| App (Next.js) | http://localhost:3000 |
| Server (API) | http://localhost:8080 |
| Auth emulator / its UI | ports 9099 / http://127.0.0.1:4000 |
| MongoDB (Docker) | port 27017 |

### 4. Create the indexes and load the demo data

In a second terminal, once the emulator is ready:

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
npm start
```

The server serves the built app (`apps/web/out`) and the API on **http://localhost:8080**, with the service worker
enabled. Run `npm run emulators` in its own terminal: it is the Auth emulator the demo accounts sign in with.
After a new `npm run build`, reload the page: the "A new version is available" message appears.
If you created `apps/web/.env.production.local` for a deployment, rename it first: the build would use it instead of the emulator.

## Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Auth emulator, server and dev server |
| `npm run dev:docker` | The same, after starting the local MongoDB (Docker) |
| `npm run emulators` | The Auth emulator alone (sign-in accounts kept in `.emulator-data/`) |
| `npm run emulators:clean` | The same, with no import or export of the emulator data |
| `npm run mongo:up` / `mongo:down` | Start / stop the local MongoDB (Docker Compose, one-node replica set) |
| `npm run mongo:init-indexes` | Create the MongoDB indexes (run once per database, including Atlas) |
| `npm run seed` | Load the demo accounts and data |
| `npm run create-admin -- <email>` | Create an administrator (or make an account one); add `--production` for the real Firebase project |
| `npm run build` | Build the server and the app (`server/dist`, `apps/web/out`) |
| `npm start` | Run the built server, which also serves the built app |
| `npm run typecheck` | TypeScript check of every workspace |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (shared and server) |
| `npm run test:api` | API tests: starts MongoDB (Docker) and the Auth emulator, seeds a `reservation_test` database, starts the built server and calls it as real users |
| `npm run check:prod` | Checks the production configuration (see Deployment) |
| `npm run icons` | Regenerate the PWA icons (`apps/web/public/icons`) |

## Translations

Texts live in `packages/shared/src/i18n/fr.json` (the reference) and `en.json`.
To add a text, add the same key to both files, then use `t("my.key")` from `useI18n()`.
The tests check that both files have exactly the same keys and the same variables.

## Troubleshooting

- **Node version error**: use Node 22 (`nvm use` reads `.nvmrc`).
- **`docker` is not found when running `npm run dev:docker`**: install Docker, or use MongoDB Atlas with `npm run dev`.
- **`MONGODB_URI is not set`**: add it to `server/.env.local` (the example file has the local Docker value).
- **`FIREBASE_PROJECT_ID is not set`** or every request answers "sign in required": the server and the web app must use the same project. In development, keep `FIREBASE_AUTH_EMULATOR_HOST` and the `demo-` project id of the example files.
- **Port already in use**: a previous run is still going. Stop it, or free ports 3000, 4000, 8080 and 9099.
- **On Windows, `next build` fails with `EBUSY`**: no terminal should be open inside `apps/web/out`.
- **A page stays on "Loading…"**: check that the server and the Auth emulator are running and that `NEXT_PUBLIC_USE_EMULATORS=true`.
- **No demo users, or empty screens**: run `npm run mongo:init-indexes` and `npm run seed` while the Auth emulator is running.
- **Connection refused or timeout with Atlas**: your IP address must be allowed in Atlas under Network Access.

## Deployment

The server is one Node process: it serves the built app, the API and the scheduled jobs, so a single host runs
everything. Any host that runs Node 22 or a Docker image works (Render, Fly.io, Railway, Cloud Run, a VPS...).
The host must provide HTTPS: sign-in and installing the app on a phone both require it.

1. **Firebase (sign-in only).** Create a Firebase project. The free Spark plan is enough: no Functions, Hosting or Storage.
   In the console, enable Authentication with the Google provider, and add your host's domain under
   Authentication > Settings > Authorized domains. Register a web app (Project settings > Your apps) to get the web keys.
   Under Project settings > Service accounts, generate a private key: the server needs it to give people their role.
   To let administrators sign in, also enable the Email/Password provider. It is safe: the server gives a role only to
   Google accounts and to accounts made with `create-admin`, so someone who signs up with an email gets access to nothing.
2. **MongoDB Atlas.** Create a cluster, a database user, and allow your host to connect (Network Access). Create the
   indexes once: `MONGODB_URI=<your Atlas URI> npm run mongo:init-indexes`.
3. **Web build.** Copy `apps/web/.env.production.example` to `apps/web/.env.production.local`, fill in the Firebase web
   keys (leave `NEXT_PUBLIC_API_URL` empty), then run `npm run build`. Next.js reads this file before `.env.local`, so
   development keeps using the emulator. With Docker, give the same values as build arguments instead (see the `Dockerfile`).
4. **Server settings.** Set these as environment variables on the host (never in a file in the repository):

   | Variable | Value |
   |---|---|
   | `FIREBASE_PROJECT_ID` | your Firebase project id |
   | `FIREBASE_SERVICE_ACCOUNT` | the service account key, the whole JSON on one line |
   | `MONGODB_URI` | the Atlas connection string |
   | `ALLOWED_EMAIL_DOMAINS` | optional: the domain(s) that may sign up with Google, comma separated. Empty lets any Google account in |
   | `GOOGLE_GENERATIVE_AI_API_KEY` | optional: the AI assistant |
   | `RESEND_API_KEY`, `RESEND_FROM` | optional: notification emails |
   | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | optional: push (`npx web-push generate-vapid-keys`; the public key is also `NEXT_PUBLIC_VAPID_PUBLIC_KEY` in the web build) |

   `server/.env.example` lists every setting. Do not set `FIREBASE_AUTH_EMULATOR_HOST` in production.
5. **Check, then start.** `node --env-file=server/.env.production.local scripts/production-check.mjs` checks steps 3 and 4
   (no demo project, not built for the emulator, a service account, not the development database...). Put the server settings in that git-ignored file to check them, or run the script where
   the variables are set. It cannot see the host, Atlas or the Firebase console, so it lists those too.
   Then start the server with `npm start` (or the Docker image).
6. **First administrator.** `npm run create-admin -- you@yourcompany.com --production` creates the account and prints a password once.
   Sign in with it under "Sign in with email", then add the other administrators the same way.

Run a single instance, or several: each scheduled job claims its run in MongoDB, so two instances never send the
same reminders twice.
