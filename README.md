# Space Booking (Réservation d'Espace)

Progressive web app (PWA) for booking desks, meeting rooms and coworking spaces. The UI is available in French and English.

**Stack:** Next.js 16 (static export) · React 19 · Tailwind CSS 4 · Node server (Express) · MongoDB (data and photos) · Firebase Auth (Google sign-in only) · Serwist (service worker) · Vitest.

## Modules and progress

The app is split into **9 modules**. A module is a part of the app that owns its own collections (the "tables"),
so each developer can work on one module without touching the data of the others.

Legend: ✅ done · 🟡 done, with a limit to know about · ⬜ not started

**Progress: all 9 modules are built and tested.** The remaining limits are listed under each module and summed up in
[Known limits](#known-limits).

| # | Module | Owns (collections) | Status |
|---|---|---|---|
| 1 | [**Users**](#1-users) | `users`, `departments`, `teams` | ✅ Done |
| 2 | [**Spaces**](#2-spaces) | `sites`, `spaces` | ✅ Done |
| 3 | [**Bookings**](#3-bookings) | `bookings`, `absences` | ✅ Done |
| 4 | [**Notifications**](#4-notifications) | `notifications`, `devices` | 🟡 Push is not tested automatically |
| 5 | [**Credits & Subscriptions**](#5-credits--subscriptions) | `wallets`, `creditTransactions`, `plans`, `subscriptions`, `payments` | 🟡 Stripe works; a subscription is charged once |
| 6 | [**Incidents & Equipment**](#6-incidents--equipment) | `incidents`, `equipmentRequests` | ✅ Done |
| 7 | [**Analytics & Audit**](#7-analytics--audit) | `auditLogs` | ✅ Done |
| 8 | [**Visitors**](#8-visitors) | `visits` | ✅ Done |
| 9 | [**Calendar**](#9-calendar) | `events` | ✅ Done |

A module's data is written only by its own endpoints; the others read it through them.

### 1. Users

Owns `users`, `departments`, `teams`. Screens: sign-in, profile, `/admin/utilisateurs`, `/admin/organisation`, `/equipe`.

- ✅ Google sign-in for everyone: a Google account is always a regular `user`, with an optional email-domain restriction. Demo accounts for development.
- ✅ Administrators are created apart from Google, with `npm run create-admin` (email and password). An admin can make a user a `manager` from the Users screen, but not an admin.
- ✅ Roles: `user` < `manager` < `admin`. Admin user list with role filter and pagination.
- ✅ Directory sync (every night, and on demand for administrators) that disables departed employees and cancels their upcoming bookings.
- ✅ Profile: display name, notification preferences, language (FR/EN), department and teams. Sign-in with Google, or with an email and a password for administrators.
- ✅ Departments and teams administration; users are placed in a department and in teams by an administrator.
- ✅ Manager view of their teams' bookings (`/equipe`).
- ✅ GDPR: export of personal data, deletion of the account (by the user or an administrator).

### 2. Spaces

Owns `sites`, `spaces`. Screen: `/admin/espaces`.

- ✅ Sites with address, time zone, floors and default opening hours.
- ✅ Spaces: desk, open space, meeting room, coworking, phone booth. Capacity, price in credits per hour, equipment, features.
- ✅ Opening hours per space and exceptional closures.
- ✅ Every site and space is validated by the server before it is saved, and only administrators can change them.

### 3. Bookings

Owns `bookings` and `absences`. Screens: `/reserver`, `/mes-reservations`, `/admin/reservations`.

- ✅ Availability search by site, date, time slot and number of people, with filters on type, capacity and equipment.
- ✅ Booking with no double booking (checked in a transaction): desks and rooms are booked whole, open spaces and coworking seat by seat.
- ✅ Rules: 30 minute slots, 8 hours maximum, opening hours, closures, 60 days ahead, no overlap for one user.
- ✅ My bookings (upcoming and past), change and cancel, readable offline. The [Calendar](#9-calendar) shows them by day, week or month.
- ✅ Absences: declaring one cancels and refunds the bookings inside it and blocks new ones.
- ✅ Admin: all bookings by period, force release with a reason, move to another space or time.
- 🟡 Not included: recurring bookings and waiting lists.

### 4. Notifications

Owns the `notifications` and `devices` collections. Screen: the bell in the header, which opens a popup (there is no notifications page).

- ✅ In-app inbox in a popup under the bell: the latest 50, read / unread, mark all as read, a click opens the item's page. Written in the user's language. The home page's "unread" link opens it too.
- ✅ Sent for: booking confirmed, cancelled, moved, 24 h reminder, weekly digest, credits added, subscription renewed, incident updates.
- 🟡 Push (Web Push): the server sends it with VAPID keys and the service worker shows it. It needs HTTPS and a real browser, so it is not tested automatically. On iPhone the app must be installed first.
- ✅ Email through Resend (set `RESEND_API_KEY`; without it, emails are skipped).
- ✅ The reminders (every hour) and the weekly digest (Monday 07:00) run inside the server.

### 5. Credits & Subscriptions

Owns `wallets`, `creditTransactions`, `plans`, `subscriptions`, `payments`. Screens: `/credits`, `/admin/credits`.

- ✅ Balance and full history. Bookings are charged, cancellations and changes are refunded or charged the difference.
- ✅ Plans: credit packs and monthly subscriptions, created and priced by an administrator.
- ✅ Subscriptions renew every month (nightly job) and can be cancelled.
- ✅ Administrators adjust balances. Optional welcome credits for new accounts (`WELCOME_CREDITS`).
- ✅ Card payment with Stripe, in a form inside the app (Stripe's payment element, so card numbers never reach this server). With test keys (`sk_test_`, `pk_test_`) payments are simulated and no money moves; the cards to use are in [docs/stripe-test-cards.md](docs/stripe-test-cards.md).
- ✅ The price comes from the plan, never from the browser. The server asks Stripe itself whether a payment succeeded, and a payment can give credits only once, whether the browser or Stripe's webhook confirms it first.
- 🟡 Subscriptions are paid once, on the first month. The next months' credits are still given by the nightly job without a new charge.

### 6. Incidents & Equipment

Owns `incidents`, `equipmentRequests`. Screens: `/support`, `/admin/support`.

- ✅ Report an incident with up to 3 photos (stored in MongoDB, shrunk on the phone before upload, readable only by their author and the administrators), optionally linked to a space.
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
- ✅ Authorization is enforced entirely in the server's endpoints (`server/src/visitors/visits.ts`): the role check of
  `secureCall` and ownership checks (a host sees only their own invites; check-in and check-out are for administrators).

### 9. Calendar

Owns `events`. Screen: `/calendrier`.

- ✅ Your bookings, past and future, and your own events, by **day**, **week** or **month**. Weeks start on Monday, the day and week views are hour grids, and items that overlap sit side by side.
- ✅ Personal events (title, day, optional time or all day, note): private to you, added, changed and deleted from the calendar. At most 500 per person.
- ✅ Clicking a day or an hour offers to add an event or to book a space: the booking form opens with that day and time filled in. Booking is not offered for days that are over.
- ✅ Works offline for the periods already visited, like the other screens. Cancelled bookings are not shown.
- ✅ Included in the personal data export and removed with the account.
- 🟡 Events are private: nobody else sees them, and they do not block bookings.

### Shared platform (not owned by a single module)

Already built and used by every module. Change it through a pull request that the whole team can see.

- **Auth and roles:** the sign-in flow, the `secureCall` wrapper of the server's endpoints (authentication, role check, rate limiting, input validation) and the role helpers in `packages/shared`.
- **Access control:** done in the server, not in the database. `secureCall` requires a company role on every endpoint (at least `user`), and each endpoint checks what the caller may touch.
- **Translations:** `fr.json` and `en.json`. Each module adds its keys under its own namespace.
- **PWA shell:** install prompt, offline support (the last answers are kept on the device), update message, navigation, page layout.
- **Dark mode:** a button in the header and on the sign-in page goes through "follow the device", light and dark. The choice is remembered and applied before the first paint. The dark theme remaps the color palette in `globals.css`, so screens need no dark-specific classes (use the palette names, not fixed colors, except for panels that must stay blue).
- **Scheduled jobs:** reminders, weekly digest, subscription renewals and directory sync run inside the server; each run is claimed in MongoDB so several instances never do it twice.
- **Sign-in and deployment:** see [How it fits together](#how-it-fits-together) and [Deployment](#deployment).
- **Quality:** typecheck, lint, unit tests, API tests and GitHub Actions CI.

### Known limits

- **Subscriptions** are charged once, on the first month; the next months' credits are given by the nightly job without a new charge.
- **Stripe** runs in test mode with test keys. Real payments need live keys and a webhook endpoint (see [Pay with Stripe](#pay-with-stripe-test-mode)).
- **Push notifications** need HTTPS and a real browser, so they are not tested automatically. On iPhone the app must be installed first.
- **Recurring bookings and waiting lists** do not exist.
- **Calendar events** are private to their owner and do not block bookings.
- **The Calendar** is not in the phone's bottom bar (it holds 5 entries); it is reached from the home page.
- **The service worker** (install, offline) is only verified in a real browser, not by the automated tests.

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
| `npm test` | Unit tests (shared, server and web) |
| `npm run test:api` | API tests: starts MongoDB (Docker) and the Auth emulator, seeds a `reservation_test` database, starts the built server and calls it as real users |
| `npm run check:prod` | Checks the production configuration (see Deployment) |
| `npm run icons` | Regenerate the PWA icons (`apps/web/public/icons`) |

## Translations

Texts live in `packages/shared/src/i18n/fr.json` (the reference) and `en.json`.
To add a text, add the same key to both files, then use `t("my.key")` from `useI18n()`.
The tests check that both files have exactly the same keys and the same variables.

## Pay with Stripe (test mode)

Credits are bought with a card through Stripe. In test mode nothing real is charged.

1. Create a free account at stripe.com and stay in **test mode**. Under Developers > API keys, copy the **publishable**
   key (`pk_test_...`) and the **secret** key (`sk_test_...`).
2. Put the secret key in `server/.env.local` as `STRIPE_SECRET_KEY=sk_test_...`, and the publishable key in
   `apps/web/.env.local` as `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...`. Restart the dev server.
3. On the Credits page, click Buy and pay with a test card from [docs/stripe-test-cards.md](docs/stripe-test-cards.md).
4. Optional, so that credits also arrive when the buyer closes the page right after paying: install the Stripe CLI, run
   `stripe listen --forward-to localhost:8080/api/stripe/webhook`, and put the `whsec_...` it prints in
   `STRIPE_WEBHOOK_SECRET`. In production, add an endpoint in the Stripe dashboard for the event `payment_intent.succeeded`.

## Troubleshooting

- **Node version error**: use Node 22 (`nvm use` reads `.nvmrc`).
- **`docker` is not found when running `npm run dev:docker`**: install Docker, or use MongoDB Atlas with `npm run dev`.
- **`MONGODB_URI is not set`**: add it to `server/.env.local` (the example file has the local Docker value).
- **`FIREBASE_PROJECT_ID is not set`** or every request answers "sign in required": the server and the web app must use the same project. In development, keep `FIREBASE_AUTH_EMULATOR_HOST` and the `demo-` project id of the example files.
- **Port already in use**: a previous run is still going. Stop it, or free ports 3000, 4000, 8080 and 9099.
- **On Windows, `next build` fails with `EBUSY`**: no terminal should be open inside `apps/web/out`.
- **A page stays on "Loading…"**: check that the server and the Auth emulator are running and that `NEXT_PUBLIC_USE_EMULATORS=true`.
- **No demo users, or empty screens**: run `npm run mongo:init-indexes` and `npm run seed` while the Auth emulator is running.
- **The Buy buttons are disabled**: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is missing from the web build. **"Payments are unavailable"**: `STRIPE_SECRET_KEY` is missing or wrong on the server.
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
   | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | the payment of credits (`sk_test_...` simulates payments; the webhook secret is optional). The public key `pk_...` is `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` in the web build |
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
