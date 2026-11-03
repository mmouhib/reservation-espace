# Accounts, projects and keys

Step by step: how to create each account or project the app talks to, which key to take from it, and where that key
goes. The websites change their menus from time to time, so a label may differ a little; the names of the values do not.

| Service | What it is for | Needed? | Costs |
|---|---|---|---|
| [MongoDB Atlas](#1-mongodb-atlas) | All the data and the incident photos | Yes (or Docker, locally) | Free tier |
| [Firebase](#2-firebase-sign-in) | Sign-in and sign-up (Google, or email and password) | Production. Development uses a local emulator | Free (Spark plan) |
| [Stripe](#3-stripe) | Card payment of credits | To buy credits | Free in test mode |
| [Google AI Studio (Gemini)](#4-gemini-ai-assistant) | The AI assistant | Optional | Free tier |
| [Resend](#5-resend-emails) | Notification emails | Optional | Free tier |
| [Web Push keys](#6-web-push-keys) | Push notifications | Optional | Free, no account |

## Where the values go

| For | File (development) | In production |
|---|---|---|
| The server's secrets and settings (`MONGODB_URI`, `STRIPE_SECRET_KEY`...) | `server/.env.local` | Environment variables of your host |
| The web app's public keys (`NEXT_PUBLIC_*`) | `apps/web/.env.local` | `apps/web/.env.production.local`, before `npm run build` |

Both files are ignored by git. The `.env.example` next to each lists every setting.

**Rules for the keys**

- Never commit a key, never put one in a screenshot or a chat. A key that leaked must be revoked and replaced, not just deleted.
- A `NEXT_PUBLIC_` value ends up in the public JavaScript of the app: only public keys (Firebase web config, Stripe `pk_`, VAPID public key) go there.
- Use separate keys for development and production, and the Stripe **test** keys until you really want to charge cards.
- CI scans the whole git history for secrets (see `.github/workflows/ci.yml`).
- Before a deployment run `node --env-file=server/.env.production.local scripts/production-check.mjs`: it catches most mistakes.

---

## 1. MongoDB Atlas

The data lives in MongoDB. Locally you can use Docker (`npm run mongo:up`, no account), or Atlas for both development and production.
Atlas clusters are replica sets, which the app needs for its transactions.

1. Create an account at [mongodb.com/atlas](https://www.mongodb.com/atlas) and create a **project**.
2. **Create a cluster**: choose the free **M0** tier, a cloud provider, and a region close to your server.
3. **Database Access** > **Add New Database User**: a username and a password (letters and digits are easiest: a symbol such as `@` or `/` must be
   percent-encoded in the connection string). Give it **Read and write to any database**.
4. **Network Access** > **Add IP Address**: your current IP address for development. For a deployment, the addresses of your host, or `0.0.0.0/0`
   (anywhere; the password then protects the database). A timeout when connecting almost always means the IP is not on this list.
5. **Database** > **Connect** > **Drivers**: copy the connection string, `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/`, and replace `<password>`.
6. Put it in the server's settings, with the database name at the end:

   ```
   MONGODB_URI=mongodb+srv://user:password@cluster0.xxxxx.mongodb.net/reservation
   # development only: keep the demo data away from the real database
   MONGODB_DB_NAME=reservation_dev
   ```

7. Create the indexes once per database, then (development only) load the demo data:

   ```bash
   npm run mongo:init-indexes
   npm run seed
   ```

Never run `seed` against the production database. The API tests use their own `reservation_test` database, which they drop at each run.

## 2. Firebase (sign-in)

Firebase is used for signing in and signing up, with Google or with an email and a password, and for nothing else. The free Spark plan is enough: no Functions, Hosting or Storage. In development you do not need an account:
the local **Auth emulator** (`npm run emulators`) stands in for it.

1. Go to [console.firebase.google.com](https://console.firebase.google.com) and **Add project** (Google Analytics can stay off).
2. **Authentication** > **Get started** > **Sign-in method**: turn on **Google** (choose a support email) and **Email/Password** (leave "Email link" off), save each.
3. **Authentication** > **Settings** > **Authorized domains**: add the domain of your deployed app (`localhost` is already allowed). The link in the confirmation and
   reset emails brings people back to it, so it must be listed.
4. **Project settings** (the gear) > **Your apps** > the web icon `</>` > register an app (no Firebase Hosting). Copy the four values of `firebaseConfig`
   into the web app's settings:

   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=<project-id>.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=<project-id>
   NEXT_PUBLIC_FIREBASE_APP_ID=...
   NEXT_PUBLIC_USE_EMULATORS=false
   ```

5. **Project settings** > **Service accounts** > **Generate new private key**. The server needs it to give people their role. Turn the downloaded file
   into one line and put it in the server's settings, then delete the file:

   ```bash
   node -e "console.log(JSON.stringify(require('./the-downloaded-key.json')))"
   ```

   ```
   FIREBASE_PROJECT_ID=<project-id>
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account",...}
   ```

   (`GOOGLE_APPLICATION_CREDENTIALS=<path to the file>` also works, for a host that keeps files.) Remove `FIREBASE_AUTH_EMULATOR_HOST` from a real deployment.
6. **Emails sent by Firebase.** People who sign up with an email and a password receive a confirmation link, and "forgot password" sends a reset link. Firebase sends both
   itself, so nothing needs configuring. You can change their wording and sender name under **Authentication** > **Templates**.
   Nobody gets access before the confirmation link is opened: the server only gives the role `user` to an account whose email address is confirmed (a Google
   account always is), so nobody can sign up with someone else's address.
7. **Administrators** are not made by signing up. Create the first one:

   ```bash
   npm run create-admin -- you@yourcompany.com --production
   ```

   It prints a generated password once. Sign in with it in the "Sign in" tab.

Optional: `ALLOWED_EMAIL_DOMAINS=yourcompany.com` limits sign-up, with Google or with a password, to your company's addresses. Empty lets any address in.

In development there is no mailbox: the confirmation and reset links are in the Auth emulator (http://127.0.0.1:4000 > Authentication), and the sign-in page says so.

## 3. Stripe

Credits are bought with a card through Stripe. With **test** keys nothing real is charged.

1. Create an account at [stripe.com](https://stripe.com) and confirm your email. You can skip the business details for now: test mode does not need them.
2. Make sure you are in **test mode** (a "Test mode" or sandbox label at the top of the dashboard).
3. **Developers** > **API keys**. Copy the two keys:

   ```
   # server/.env.local
   STRIPE_SECRET_KEY=sk_test_...
   # apps/web/.env.local
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

   The secret key (`sk_`) stays on the server. The publishable key (`pk_`) is public. Both must be from the same mode.
4. Pay with the test cards of [stripe-test-cards.md](stripe-test-cards.md) (for example `4242 4242 4242 4242`, any future date, any 3 digits).
5. **Webhook** (optional locally, recommended in production): it gives the credits even if the buyer closes the page right after paying.
   - Locally: install the [Stripe CLI](https://docs.stripe.com/stripe-cli), run `stripe login`, then
     `stripe listen --forward-to localhost:8080/api/stripe/webhook`. It prints a `whsec_...`: put it in `STRIPE_WEBHOOK_SECRET`.
   - In production: **Developers** > **Webhooks** > **Add endpoint**, URL `https://<your-host>/api/stripe/webhook`, event `payment_intent.succeeded`.
     Copy the endpoint's **Signing secret** into `STRIPE_WEBHOOK_SECRET`.
6. **Going live**: activate your Stripe account (business details, bank account), switch the dashboard to live mode, and replace the keys with
   `sk_live_...` and `pk_live_...` (and the webhook secret of a live endpoint). `production-check` warns while the keys are still test keys.

## 4. Gemini (AI assistant)

The assistant and the plan-description generator use Google's Gemini. Without a key they answer with an error; the rest of the app works.

1. Open [aistudio.google.com/apikey](https://aistudio.google.com/apikey), sign in with a Google account and click **Create API key**.
2. Put it in the server's settings:

   ```
   GOOGLE_GENERATIVE_AI_API_KEY=...
   ```

The free tier has usage limits. Each user is limited to 15 messages a minute by the server.

## 5. Resend (emails)

Booking confirmations, reminders and the weekly digest are sent by email through Resend. Without a key the emails are skipped (a warning is logged).

1. Create an account at [resend.com](https://resend.com).
2. **Domains** > **Add domain**: add the DNS records Resend shows you at your domain provider and wait until the domain is **Verified**.
   Until then Resend only lets you send test emails to your own address.
3. **API Keys** > **Create API Key** (sending access is enough).
4. Put them in the server's settings. The sender must use the verified domain:

   ```
   RESEND_API_KEY=re_...
   RESEND_FROM=Réservation <no-reply@yourdomain.com>
   ```

## 6. Web Push keys

Push notifications use the browsers' standard Web Push, with a pair of VAPID keys that you generate yourself (no account).

1. Generate the pair once:

   ```bash
   npx web-push generate-vapid-keys
   ```

2. Put the private key and the public key in the server's settings, and the **same public key** in the web app's:

   ```
   # server/.env.local
   VAPID_PUBLIC_KEY=...
   VAPID_PRIVATE_KEY=...
   VAPID_SUBJECT=mailto:you@yourdomain.com
   # apps/web/.env.local
   NEXT_PUBLIC_VAPID_PUBLIC_KEY=<the same public key>
   ```

Push needs HTTPS (or `localhost`), and on an iPhone the app must be installed to the home screen first. If the two public keys differ, no notification
ever arrives; `production-check` verifies that they match.

---

## Quick checklists

**Develop on your machine** (nothing to sign up for): install Node 22 and Docker, then follow "Run it locally" in the [README](../README.md).
Add Atlas, Stripe test keys or Gemini only for the parts you work on.

**Put it online**: [MongoDB Atlas](#1-mongodb-atlas) + [Firebase](#2-firebase-sign-in), then optionally Stripe, Gemini, Resend and the push keys. Build
the web app, set the server's environment variables on your host, run `production-check`, and start the server (see "Deployment" in the README).
