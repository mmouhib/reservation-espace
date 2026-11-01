import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { MongoClient } from "mongodb";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { COL, addDays, nowIn, weekdayOf } from "@reservation/shared";

/**
 * Calls the Cloud Functions as real users, against the emulators with the demo data
 * (see `npm run test:api`). Each test builds on the previous ones, like a user session.
 */

for (const file of ["../../apps/web/.env.local", "../../functions/.env.local"]) {
  const envFile = resolve(__dirname, file);
  if (existsSync(envFile)) process.loadEnvFile(envFile);
}
const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

// Overridable so the suite can run on spare ports next to a running `npm run dev`.
const FUNCTIONS_HOST = process.env.FUNCTIONS_EMULATOR_HOST ?? "127.0.0.1:5001";
const AUTH_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1:9099";
const FUNCTIONS = `http://${FUNCTIONS_HOST}/demo-reservation-espace/europe-west1`;
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
  const res = await fetch(`${FUNCTIONS}/${name}`, { method: "POST", headers, body: JSON.stringify({ data }) });
  const body = (await res.json()) as { result?: unknown; error?: { status: string; details?: { reason?: string } } };
  return body.error ? { error: body.error.details?.reason ?? body.error.status } : { result: body.result };
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
    expect((await call("purchasePlan", hugo, { planId: "monthly-20" })).error).toBe("alreadySubscribed");
    expect((await call("purchasePlan", lea, { planId: "legacy-5" })).error).toBe("planNotFound");
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
      ["purchasePlan", { planId: "pack-10" }],
    ] as const) {
      expect((await call(name, idToken, data)).error, name).toBe("forbidden");
    }
    expect((await call("bootstrapProfile", idToken, {})).error).not.toBe("forbidden");
  });
});
