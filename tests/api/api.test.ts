import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import Stripe from "stripe";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COL, addDays, nowIn, weekdayOf } from "@reservation/shared";

/**
 * Calls the server's API as real users, against the Auth emulator and the demo data
 * (see `npm run test:api`). Each test builds on the previous ones, like a user session.
 */

for (const file of ["../../apps/web/.env.local", "../../server/.env.local"]) {
  const envFile = resolve(__dirname, file);
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}
const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

// The server is started by global-setup.ts. Ports are overridable so the suite can run next to `npm run dev`.
const API = `http://127.0.0.1:${process.env.API_TEST_PORT ?? "8099"}/api`;
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const AUTH = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=demo`;
const SIGN_UP = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo`;
const mongo = new MongoClient(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/reservation?replicaSet=rs0");
afterAll(() => mongo.close());

async function login(email: string): Promise<string> {
  const res = await fetch(AUTH, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, returnSecureToken: true }),
  });
  return ((await res.json()) as { idToken: string }).idToken;
}

type Outcome = { result?: any; error?: string };

async function call(name: string, token: string | null, data: object = {}): Promise<Outcome> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}/${name}`, { method: "POST", headers, body: JSON.stringify(data) });
  const body = (await res.json()) as { data?: unknown; error?: { code: string; reason?: string } };
  return body.error ? { error: body.error.reason ?? body.error.code } : { result: body.data };
}

async function balance(uid: string): Promise<number> {
  const wallet = await mongo.db(process.env.MONGODB_DB_NAME || undefined).collection<{ _id: string; balance: number }>(COL.wallets).findOne({ _id: uid });
  return wallet?.balance ?? 0;
}

/** How many bookings match, straight from the database (the API only shows a user their own). */
async function countBookings(filter: object): Promise<number> {
  return mongo.db(process.env.MONGODB_DB_NAME || undefined).collection(COL.bookings).countDocuments(filter);
}

/** The first date, from `fromDay` on, that falls on the given weekday. */
function nextWeekday(fromDay: string, weekday: ReturnType<typeof weekdayOf>): string {
  let date = fromDay;
  while (weekdayOf(date) !== weekday) date = addDays(date, 1);
  return date;
}

const today = nowIn("Europe/Paris").date;
const DAY = nextWeekday(addDays(today, 6), "tue");
const SUNDAY = nextWeekday(addDays(today, 2), "sun");

let lea: string;
let hugo: string;
let camille: string;
let startBalance: number;
let bookingId: string;
let absenceId: string;

describe("bookings", () => {
  beforeAll(async () => {
    [lea, hugo, camille] = await Promise.all([login("user@exemple.fr"), login("manager@exemple.fr"), login("admin@exemple.fr")]);
    startBalance = await balance("demo-user");
  });

  it("books a desk and charges the credits", async () => {
    const booking = await call("createBooking", lea, { spaceId: "paris-1A-04", date: DAY, from: 540, to: 660 });
    expect(booking.result?.bookingId).toBeTruthy();
    bookingId = booking.result.bookingId;
    expect(await balance("demo-user")).toBe(startBalance - 2);
  });

  it("refuses a second booking at the same time for the same user", async () => {
    const second = await call("createBooking", lea, { spaceId: "paris-1A-05", date: DAY, from: 600, to: 720 });
    expect(second.error).toBe("alreadyBooked");
  });

  it("refuses a space that is taken", async () => {
    expect((await call("createBooking", hugo, { spaceId: "paris-1A-04", date: DAY, from: 600, to: 720 })).error).toBe("slotTaken");
  });

  it("refuses slots that break the rules", async () => {
    const book = (date: string, from: number, to: number, extra: object = {}) =>
      call("createBooking", hugo, { spaceId: "paris-1A-06", date, from, to, ...extra });
    expect((await book(DAY, 360, 420)).error).toBe("outsideHours");
    expect((await book(SUNDAY, 540, 600)).error).toBe("outsideHours");
    expect((await book(addDays(today, -3), 540, 600)).error).toBe("pastSlot");
    expect((await book(addDays(today, 90), 540, 600)).error).toBe("tooFarAhead");
    expect((await book(DAY, 545, 600)).error).toBe("invalidSlot");
    expect((await call("createBooking", hugo, { spaceId: "paris-salle-orsay", date: DAY, from: 540, to: 570, attendees: 9 })).error).toBe("tooManyAttendees");
  });

  it("refuses a booking the user cannot pay for", async () => {
    // A room costs 4 credits an hour: 8 hours are more than the demo balance.
    expect((await call("createBooking", lea, { spaceId: "paris-salle-louvre", date: addDays(DAY, 1), from: 540, to: 1020 })).error).toBe("notEnoughCredits");
  });

  it("tells whether spaces are free, without exposing who booked them", async () => {
    const search = await call("searchSpaces", hugo, { siteId: "paris", date: DAY, from: 540, to: 660 });
    const taken = search.result.find((s: { spaceId: string }) => s.spaceId === "paris-1A-04");
    expect([taken.available, taken.reason]).toEqual([false, "slotTaken"]);
    expect(JSON.stringify(search.result)).not.toContain("demo-user");
  });

  it("lets only the owner or an administrator change a booking", async () => {
    expect((await call("updateBooking", hugo, { bookingId, date: DAY, from: 780, to: 900 })).error).toBe("forbidden");
    expect((await call("updateBooking", lea, { bookingId, date: DAY, from: 780, to: 900 })).result?.updated).toBe(true);
    // The morning slot is free again.
    expect((await call("createBooking", hugo, { spaceId: "paris-1A-04", date: DAY, from: 540, to: 600 })).result?.bookingId).toBeTruthy();
    expect((await call("updateBooking", camille, { bookingId, spaceId: "paris-1A-05", date: DAY, from: 780, to: 900 })).result?.updated).toBe(true);
  });

  it("cancels the bookings of an absence and refunds them", async () => {
    const absence = await call("declareAbsence", lea, { from: DAY, to: DAY, note: "test" });
    expect(absence.result?.cancelled).toBe(1);
    absenceId = absence.result.absenceId;
    expect(await balance("demo-user")).toBe(startBalance);
    expect((await call("createBooking", lea, { spaceId: "paris-1A-06", date: DAY, from: 540, to: 600 })).error).toBe("absent");
    expect((await call("removeAbsence", lea, { absenceId })).result?.removed).toBe(true);
  });
});

describe("credits and access", () => {
  it("lets only administrators adjust credits", async () => {
    expect((await call("adjustCredits", lea, { uid: "demo-user", amount: 100 })).error).toBe("forbidden");
    expect((await call("adjustCredits", camille, { uid: "demo-user", amount: 5, label: "test" })).result?.adjusted).toBe(true);
    expect(await balance("demo-user")).toBe(startBalance + 5);
  });

  it("refuses a second subscription and hidden plans", async () => {
    expect((await call("createPayment", hugo, { planId: "monthly-20" })).error).toBe("alreadySubscribed");
    expect((await call("createPayment", lea, { planId: "legacy-5" })).error).toBe("planNotFound");
  });

  it("shows the team view to managers only", async () => {
    expect((await call("teamBookings", lea, { date: DAY })).error).toBe("forbidden");
    expect(Array.isArray((await call("teamBookings", hugo, { date: DAY })).result?.members)).toBe(true);
  });

  it("exports the personal data of the user", async () => {
    const data = await call("exportMyData", lea);
    expect(data.result.profile.email).toBe("user@exemple.fr");
    expect(Array.isArray(data.result.bookings)).toBe(true);
  });

  it("refuses calls without authentication", async () => {
    expect((await call("searchSpaces", null, { siteId: "paris", date: DAY, from: 540, to: 600 })).error).toBe("authRequired");
  });
});

describe("payment", () => {
  it("leaves no booking behind when the user cannot pay", async () => {
    // The "cannot pay" test above tried an 8 hour room booking with too few credits.
    expect(await countBookings({ userId: "demo-user", spaceId: "paris-salle-louvre", date: addDays(DAY, 1) })).toBe(0);
  });
});

describe("simultaneous requests", () => {
  it("confirms only one of several bookings for the same desk at the same moment", async () => {
    const day = addDays(DAY, 7);
    const results = await Promise.all([lea, hugo, camille].map((token) => call("createBooking", token, { spaceId: "paris-2B-05", date: day, from: 540, to: 600 })));

    expect(results.filter((r) => r.result?.bookingId)).toHaveLength(1);
    expect(results.filter((r) => r.error === "slotTaken")).toHaveLength(2);
    expect(await countBookings({ spaceId: "paris-2B-05", date: day, status: "confirmed" })).toBe(1);
  });

  it("lets a user hold only one of two bookings made at the same moment", async () => {
    const day = addDays(DAY, 14);
    const results = await Promise.all(["paris-2B-01", "paris-2B-02"].map((spaceId) => call("createBooking", hugo, { spaceId, date: day, from: 540, to: 600 })));

    expect(results.filter((r) => r.result?.bookingId)).toHaveLength(1);
    expect(results.filter((r) => r.error === "alreadyBooked")).toHaveLength(1);
    expect(await countBookings({ userId: "demo-manager", date: day, status: "confirmed" })).toBe(1);
  });

  it("lets exactly the allowed number of calls through, even all at once", async () => {
    // getMyWallet allows 30 calls a minute per user, and nothing else in this suite calls it as Camille.
    const results = await Promise.all(Array.from({ length: 40 }, () => call("getMyWallet", camille)));

    expect(results.filter((r) => r.result)).toHaveLength(30);
    expect(results.filter((r) => r.error === "rateLimited")).toHaveLength(10);
  });
});

describe("accounts without a company role", () => {
  it("can neither read company data nor buy credits", async () => {
    const res = await fetch(SIGN_UP, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: `outsider-${Date.now()}@gmail.com`, password: "outsider-password", returnSecureToken: true }),
    });
    const { idToken } = (await res.json()) as { idToken: string };

    // Signed in, but never given a role: only bootstrapProfile may be called.
    for (const [name, data] of [
      ["listSites", {}],
      ["listSpaces", {}],
      ["listPlans", {}],
      ["searchSpaces", { siteId: "paris", date: DAY, from: 540, to: 600 }],
      ["createPayment", { planId: "pack-10" }],
    ] as const) {
      expect((await call(name, idToken, data)).error, name).toBe("forbidden");
    }
    // Signing up with an email and a password never gives a role: only Google accounts get one.
    expect((await call("bootstrapProfile", idToken, {})).error).toBe("forbidden");
  });
});

describe("requests without a valid sign-in", () => {
  it("are refused, with or without a token", async () => {
    expect((await call("listSites", null)).error).toBe("authRequired");
    expect((await call("listSites", "not-a-token")).error).toBe("authRequired");
    const unknown = await fetch(`${API}/doesNotExist`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(unknown.status).toBe(404);
  });
});

describe("incident photos", () => {
  // A 1x1 PNG.
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const upload = (token: string | null, body: Buffer | string, contentType = "image/png") =>
    fetch(`${API}/uploads/photos`, { method: "POST", headers: { "Content-Type": contentType, ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body });
  const download = (token: string | null, id: string) =>
    fetch(`${API}/uploads/photos/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  let photoId: string;

  it("are uploaded by a signed-in user and only images are accepted", async () => {
    expect((await upload(null, PNG)).status).toBe(401);
    expect((await upload(lea, "<svg onload=alert(1)/>", "image/svg+xml")).status).toBe(400);
    expect((await upload(lea, "just text", "text/plain")).status).toBe(400);
    expect((await upload(lea, Buffer.alloc(6 * 1024 * 1024), "image/jpeg")).status).toBe(413);

    const res = await upload(lea, PNG);
    expect(res.status).toBe(200);
    photoId = ((await res.json()) as { data: { photoId: string } }).data.photoId;
    expect(photoId).toMatch(/^[0-9a-f]{24}$/);
  });

  it("can be read by their owner and an administrator, not by another employee", async () => {
    const own = await download(lea, photoId);
    expect(own.status).toBe(200);
    expect(own.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await own.arrayBuffer()).equals(PNG)).toBe(true);
    expect((await download(camille, photoId)).status).toBe(200);
    expect((await download(hugo, photoId)).status).toBe(404);
    expect((await download(null, photoId)).status).toBe(401);
    expect((await download(lea, "not-an-id")).status).toBe(404);
  });

  it("can be attached to an incident only by the person who uploaded them", async () => {
    expect((await call("createIncident", hugo, { title: "Screen broken", description: "", photoIds: [photoId] })).error).toBe("invalidInput");
    expect((await call("createIncident", lea, { title: "Screen broken", description: "", photoIds: ["0".repeat(24)] })).error).toBe("invalidInput");
    const incident = await call("createIncident", lea, { title: "Screen broken", description: "Flickers", photoIds: [photoId] });
    expect(incident.result?.incidentId).toBeTruthy();
    const mine = await call("listMyIncidents", lea);
    expect(mine.result.find((i: { id: string }) => i.id === incident.result.incidentId).photoIds).toEqual([photoId]);
  });
});

describe("Google sign-up and roles", () => {
  const SIGN_IN_WITH_GOOGLE = `http://${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithIdp?key=demo`;

  /** Signs in with a fake Google account on the Auth emulator. */
  async function googleSignIn(email: string, verified = true): Promise<{ token: string; uid: string }> {
    const idToken = JSON.stringify({ sub: `google-${email}`, email, email_verified: verified });
    const res = await fetch(SIGN_IN_WITH_GOOGLE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        postBody: `providerId=google.com&id_token=${encodeURIComponent(idToken)}`,
        requestUri: "http://localhost",
        returnIdpCredential: true,
        returnSecureToken: true,
      }),
    });
    const body = (await res.json()) as { idToken: string; localId: string };
    return { token: body.idToken, uid: body.localId };
  }

  const email = `newcomer-${Date.now()}@exemple.fr`;

  it("gives a Google account the role user, never admin, even when its email was configured before", async () => {
    const first = await googleSignIn(email);
    expect((await call("bootstrapProfile", first.token, {})).result?.created).toBe(true);

    // A new token carries the role.
    const { token, uid } = await googleSignIn(email);
    expect((await call("listSites", token)).error).toBeUndefined();
    expect((await call("setUserRole", token, { uid, role: "admin" })).error).toBe("forbidden");
    expect((await call("listAllIncidents", token)).error).toBe("forbidden");
  });

  it("refuses a Google account whose email is not verified", async () => {
    const { token } = await googleSignIn(`unverified-${Date.now()}@exemple.fr`, false);
    expect((await call("bootstrapProfile", token, {})).error).toBe("forbidden");
  });

  it("lets an administrator make a Google user a manager, but not an administrator", async () => {
    const { uid } = await googleSignIn(email);
    expect((await call("setUserRole", camille, { uid, role: "admin" })).error).toBe("forbidden");
    expect((await call("setUserRole", camille, { uid, role: "manager" })).result?.changed).toBe(true);
    // Administrators are not changed from the app either.
    expect((await call("setUserRole", camille, { uid: "demo-admin", role: "user" })).error).toBe("cannotDemoteSelf");
  });
});

describe("paying for credits with Stripe", () => {
  const STRIPE = `http://127.0.0.1:${process.env.API_TEST_STRIPE_PORT ?? "8098"}`;
  const WEBHOOK = `${API}/stripe/webhook`;
  const webhookSecret = "whsec_test_secret";

  /** What Stripe does once the card of the buyer was charged. */
  const pay = async (paymentIntentId: string) => (await fetch(`${STRIPE}/__test/succeed/${paymentIntentId}`, { method: "POST" })).json();
  const create = async (token: string, planId: string) => {
    const outcome = await call("createPayment", token, { planId });
    return outcome.result as { paymentIntentId: string; clientSecret: string };
  };

  it("refuses unknown and hidden plans, and a second subscription", async () => {
    expect((await call("createPayment", lea, { planId: "nope" })).error).toBe("planNotFound");
    expect((await call("createPayment", lea, { planId: "legacy-5" })).error).toBe("planNotFound");
    expect((await call("createPayment", hugo, { planId: "monthly-20" })).error).toBe("alreadySubscribed");
  });

  it("is the only way to buy: the old free purchase endpoint is gone", async () => {
    expect((await call("purchasePlan", lea, { planId: "pack-10" })).error).toBe("not-found");
  });

  it("gives the credits of a pack once it is paid, and only once", async () => {
    const before = await balance("demo-user");
    const payment = await create(lea, "pack-10");
    expect(payment.clientSecret).toContain(payment.paymentIntentId);

    // The card was not charged yet: no credits.
    expect((await call("confirmPayment", lea, { paymentIntentId: payment.paymentIntentId })).error).toBe("paymentFailed");
    expect(await balance("demo-user")).toBe(before);

    await pay(payment.paymentIntentId);
    expect((await call("confirmPayment", lea, { paymentIntentId: payment.paymentIntentId })).result).toEqual({ credits: 10 });
    expect((await call("confirmPayment", lea, { paymentIntentId: payment.paymentIntentId })).result).toEqual({ credits: 10 });
    expect(await balance("demo-user")).toBe(before + 10);
  });

  it("gives the credits once even when the browser and Stripe confirm at the same moment", async () => {
    const before = await balance("demo-user");
    const payment = await create(lea, "pack-10");
    await pay(payment.paymentIntentId);
    const results = await Promise.all(Array.from({ length: 6 }, () => call("confirmPayment", lea, { paymentIntentId: payment.paymentIntentId })));
    expect(results.every((r) => r.result?.credits === 10)).toBe(true);
    expect(await balance("demo-user")).toBe(before + 10);
  });

  it("does not let someone confirm another person's payment", async () => {
    const payment = await create(lea, "pack-10");
    await pay(payment.paymentIntentId);
    expect((await call("confirmPayment", hugo, { paymentIntentId: payment.paymentIntentId })).error).toBe("forbidden");
    expect((await call("confirmPayment", lea, { paymentIntentId: "pi_does_not_exist" })).error).toBe("paymentFailed");
    expect((await call("confirmPayment", lea, { paymentIntentId: "not-a-payment" })).error).toBe("invalidInput");
  });

  it("starts a subscription with the first payment", async () => {
    const before = await balance("demo-admin");
    const payment = await create(camille, "monthly-20");
    await pay(payment.paymentIntentId);
    expect((await call("confirmPayment", camille, { paymentIntentId: payment.paymentIntentId })).result).toEqual({ credits: 20 });
    expect(await balance("demo-admin")).toBe(before + 20);
    expect((await call("getMySubscription", camille)).result?.planId).toBe("monthly-20");
    expect((await call("createPayment", camille, { planId: "monthly-20" })).error).toBe("alreadySubscribed");
  });

  it("accepts Stripe's webhook only when it is signed, and gives the credits once", async () => {
    const before = await balance("demo-user");
    const payment = await create(lea, "pack-10");
    const paid = await pay(payment.paymentIntentId);
    const body = JSON.stringify({ id: "evt_test", object: "event", type: "payment_intent.succeeded", data: { object: paid } });
    const signed = (payload: string, secret = webhookSecret) => ({
      "Content-Type": "application/json",
      "Stripe-Signature": Stripe.webhooks.generateTestHeaderString({ payload, secret }),
    });

    expect((await fetch(WEBHOOK, { method: "POST", headers: signed(body, "whsec_wrong"), body })).status).toBe(400);
    expect((await fetch(WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body })).status).toBe(400);
    expect(await balance("demo-user")).toBe(before);

    expect((await fetch(WEBHOOK, { method: "POST", headers: signed(body), body })).status).toBe(200);
    expect((await fetch(WEBHOOK, { method: "POST", headers: signed(body), body })).status).toBe(200);
    expect(await balance("demo-user")).toBe(before + 10);
    // The browser confirming afterwards changes nothing.
    expect((await call("confirmPayment", lea, { paymentIntentId: payment.paymentIntentId })).result).toEqual({ credits: 10 });
    expect(await balance("demo-user")).toBe(before + 10);
  });
});

describe("calendar", () => {
  const range = { from: addDays(today, -30), to: addDays(today, 40) };
  let eventId: string;

  it("shows each person their own bookings in a range, in the past and in the future", async () => {
    const mine = await call("listMyBookingsInRange", lea, range);
    expect(Array.isArray(mine.result)).toBe(true);
    expect(mine.result.length).toBeGreaterThan(0);
    expect(mine.result.every((b: { userId: string; status: string }) => b.userId === "demo-user" && b.status === "confirmed")).toBe(true);
    const manager = await call("listMyBookingsInRange", hugo, range);
    expect(manager.result.every((b: { userId: string }) => b.userId === "demo-manager")).toBe(true);
  });

  it("refuses a range that is backwards or too long", async () => {
    expect((await call("listMyBookingsInRange", lea, { from: range.to, to: range.from })).error).toBe("invalidInput");
    expect((await call("listMyEvents", lea, { from: "2026-01-01", to: "2026-12-31" })).error).toBe("invalidInput");
  });

  it("adds, lists, changes and deletes a personal event", async () => {
    const created = await call("createEvent", lea, { title: "Dentist", date: DAY, from: 600, to: 660, note: "Bring the card" });
    eventId = created.result.eventId;
    expect(eventId).toBeTruthy();

    const listed = await call("listMyEvents", lea, { from: DAY, to: DAY });
    expect(listed.result).toEqual([{ id: eventId, title: "Dentist", note: "Bring the card", date: DAY, allDay: false, from: 600, to: 660 }]);

    expect((await call("updateEvent", lea, { eventId, title: "Dentist (moved)", date: addDays(DAY, 1), allDay: true })).result?.updated).toBe(true);
    const moved = await call("listMyEvents", lea, { from: addDays(DAY, 1), to: addDays(DAY, 1) });
    expect(moved.result[0]).toMatchObject({ title: "Dentist (moved)", allDay: true, from: 0, to: 1440 });
    expect((await call("listMyEvents", lea, { from: DAY, to: DAY })).result).toEqual([]);

    expect((await call("deleteEvent", lea, { eventId })).result?.deleted).toBe(true);
    expect((await call("listMyEvents", lea, { from: addDays(DAY, 1), to: addDays(DAY, 1) })).result).toEqual([]);
    expect((await call("deleteEvent", lea, { eventId })).error).toBe("eventNotFound");
  });

  it("keeps events private and checks their data", async () => {
    const created = await call("createEvent", lea, { title: "Private", date: DAY, allDay: true });
    const id = created.result.eventId;
    expect((await call("listMyEvents", hugo, { from: DAY, to: DAY })).result.some((e: { id: string }) => e.id === id)).toBe(false);
    expect((await call("updateEvent", hugo, { eventId: id, title: "Mine now", date: DAY, allDay: true })).error).toBe("eventNotFound");
    expect((await call("deleteEvent", hugo, { eventId: id })).error).toBe("eventNotFound");

    expect((await call("createEvent", lea, { title: "  ", date: DAY, allDay: true })).error).toBe("invalidInput");
    expect((await call("createEvent", lea, { title: "Backwards", date: DAY, from: 700, to: 600 })).error).toBe("invalidInput");
    expect((await call("createEvent", lea, { title: "Bad day", date: "2026-13-45", allDay: true })).error).toBe("invalidInput");
    await call("deleteEvent", lea, { eventId: id });
  });
});
