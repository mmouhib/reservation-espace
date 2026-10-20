import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from "firebase/firestore";
import { createTestEnv, dbAs } from "./setup";

let env: RulesTestEnvironment;

const space = {
  siteId: "paris",
  floor: "1",
  location: "North wing",
  name: "Room Louvre",
  category: "meeting_room",
  capacity: 8,
  creditsPerHour: 4,
  equipment: ["screen"],
  tags: [],
  openingHours: { mon: [{ from: 480, to: 1140 }], tue: [], wed: [], thu: [], fri: [], sat: [], sun: [] },
  status: "active",
  closures: [],
};

const booking = (userId: string) => ({ userId, userName: userId, spaceId: "s1", spaceName: "Desk", status: "confirmed", date: "2026-05-12" });

const incident = (uid: string) => ({
  reporterId: uid,
  reporterName: "Alice",
  spaceId: null,
  spaceName: null,
  title: "Broken screen",
  description: "The screen flickers",
  photoPaths: [],
  status: "open",
  adminNote: "",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

const equipmentRequest = (uid: string) => ({
  requesterId: uid,
  requesterName: "Alice",
  item: "mouse",
  quantity: 1,
  neededOn: "2026-05-12",
  comment: "",
  status: "pending",
  adminNote: "",
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

beforeAll(async () => {
  env = await createTestEnv();
});

afterAll(async () => {
  await env.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "spaces/s1"), space);
    await setDoc(doc(db, "bookings/b-alice"), booking("alice"));
    await setDoc(doc(db, "bookings/b-bob"), booking("bob"));
    await setDoc(doc(db, "wallets/alice"), { balance: 10 });
    await setDoc(doc(db, "creditTransactions/t-alice"), { userId: "alice", amount: 10 });
    await setDoc(doc(db, "creditTransactions/t-bob"), { userId: "bob", amount: 5 });
    await setDoc(doc(db, "plans/pack-10"), { name: "Pack", kind: "pack", credits: 10, priceCents: 900, active: true });
    await setDoc(doc(db, "incidents/i-alice"), { ...incident("alice"), createdAt: new Date(), updatedAt: new Date() });
    await setDoc(doc(db, "equipmentRequests/r-alice"), { ...equipmentRequest("alice"), createdAt: new Date(), updatedAt: new Date() });
  });
});

describe("spaces", () => {
  it("members read spaces, only admins write valid ones", async () => {
    await assertSucceeds(getDoc(doc(dbAs(env, "alice", "user"), "spaces/s1")));
    await assertSucceeds(setDoc(doc(dbAs(env, "root", "admin"), "spaces/s2"), space));
    await assertFails(setDoc(doc(dbAs(env, "alice", "user"), "spaces/s2"), space));
  });

  it("rejects invalid space documents", async () => {
    const admin = dbAs(env, "root", "admin");
    await assertFails(setDoc(doc(admin, "spaces/s2"), { ...space, capacity: 0 }));
    await assertFails(setDoc(doc(admin, "spaces/s2"), { ...space, category: "yacht" }));
    await assertFails(setDoc(doc(admin, "spaces/s2"), { ...space, creditsPerHour: -1 }));
    await assertFails(setDoc(doc(admin, "spaces/s2"), { ...space, name: "" }));
  });
});

describe("bookings and absences", () => {
  it("owners and admins read bookings; others cannot", async () => {
    await assertSucceeds(getDoc(doc(dbAs(env, "alice", "user"), "bookings/b-alice")));
    await assertFails(getDoc(doc(dbAs(env, "alice", "user"), "bookings/b-bob")));
    await assertSucceeds(getDoc(doc(dbAs(env, "root", "admin"), "bookings/b-bob")));
  });

  it("a user lists their own bookings", async () => {
    const db = dbAs(env, "alice", "user");
    await assertSucceeds(getDocs(query(collection(db, "bookings"), where("userId", "==", "alice"))));
    await assertFails(getDocs(collection(db, "bookings")));
  });

  it("nobody writes bookings or absences from the client", async () => {
    const admin = dbAs(env, "root", "admin");
    await assertFails(setDoc(doc(admin, "bookings/b-new"), booking("root")));
    await assertFails(updateDoc(doc(dbAs(env, "alice", "user"), "bookings/b-alice"), { status: "cancelled" }));
    await assertFails(addDoc(collection(admin, "absences"), { userId: "root" }));
  });
});

describe("credits", () => {
  it("users read their own wallet and transactions only", async () => {
    const alice = dbAs(env, "alice", "user");
    await assertSucceeds(getDoc(doc(alice, "wallets/alice")));
    await assertFails(getDoc(doc(dbAs(env, "bob", "user"), "wallets/alice")));
    await assertSucceeds(getDocs(query(collection(alice, "creditTransactions"), where("userId", "==", "alice"))));
    await assertFails(getDocs(query(collection(alice, "creditTransactions"), where("userId", "==", "bob"))));
  });

  it("nobody edits a balance from the client", async () => {
    await assertFails(setDoc(doc(dbAs(env, "alice", "user"), "wallets/alice"), { balance: 9999 }));
    await assertFails(setDoc(doc(dbAs(env, "root", "admin"), "wallets/alice"), { balance: 9999 }));
  });

  it("members read plans, only admins write valid ones", async () => {
    await assertSucceeds(getDoc(doc(dbAs(env, "alice", "user"), "plans/pack-10")));
    const admin = dbAs(env, "root", "admin");
    await assertSucceeds(setDoc(doc(admin, "plans/pack-20"), { name: "Pack 20", description: "", kind: "pack", credits: 20, priceCents: 1600, active: true }));
    await assertFails(setDoc(doc(admin, "plans/bad"), { name: "Bad", kind: "pack", credits: 0, priceCents: 100, active: true }));
    await assertFails(setDoc(doc(dbAs(env, "alice", "user"), "plans/mine"), { name: "Mine", kind: "pack", credits: 5, priceCents: 0, active: true }));
  });
});

describe("incidents", () => {
  it("a user reports an incident as themselves, with status open", async () => {
    const alice = dbAs(env, "alice", "user");
    await assertSucceeds(addDoc(collection(alice, "incidents"), incident("alice")));
    await assertFails(addDoc(collection(alice, "incidents"), incident("bob")));
    await assertFails(addDoc(collection(alice, "incidents"), { ...incident("alice"), status: "resolved" }));
    await assertFails(addDoc(collection(alice, "incidents"), { ...incident("alice"), title: "" }));
  });

  it("only the reporter and admins read an incident", async () => {
    await assertSucceeds(getDoc(doc(dbAs(env, "alice", "user"), "incidents/i-alice")));
    await assertFails(getDoc(doc(dbAs(env, "bob", "user"), "incidents/i-alice")));
    await assertSucceeds(getDoc(doc(dbAs(env, "root", "admin"), "incidents/i-alice")));
  });

  it("only admins change the status", async () => {
    const change = { status: "in_progress", adminNote: "On it", updatedAt: serverTimestamp() };
    await assertSucceeds(updateDoc(doc(dbAs(env, "root", "admin"), "incidents/i-alice"), change));
    await assertFails(updateDoc(doc(dbAs(env, "alice", "user"), "incidents/i-alice"), change));
    await assertFails(updateDoc(doc(dbAs(env, "root", "admin"), "incidents/i-alice"), { title: "Rewritten" }));
    await assertFails(deleteDoc(doc(dbAs(env, "root", "admin"), "incidents/i-alice")));
  });
});

describe("equipment requests", () => {
  it("a user requests equipment for themselves", async () => {
    const alice = dbAs(env, "alice", "user");
    await assertSucceeds(addDoc(collection(alice, "equipmentRequests"), equipmentRequest("alice")));
    await assertFails(addDoc(collection(alice, "equipmentRequests"), { ...equipmentRequest("alice"), item: "car" }));
    await assertFails(addDoc(collection(alice, "equipmentRequests"), { ...equipmentRequest("alice"), quantity: 0 }));
    await assertFails(addDoc(collection(alice, "equipmentRequests"), { ...equipmentRequest("alice"), status: "approved" }));
  });

  it("only admins answer a request", async () => {
    const answer = { status: "approved", adminNote: "Ok", updatedAt: serverTimestamp() };
    await assertSucceeds(updateDoc(doc(dbAs(env, "root", "admin"), "equipmentRequests/r-alice"), answer));
    await assertFails(updateDoc(doc(dbAs(env, "alice", "user"), "equipmentRequests/r-alice"), answer));
  });
});

describe("mail queue", () => {
  it("is not accessible from the client", async () => {
    await assertFails(addDoc(collection(dbAs(env, "root", "admin"), "mail"), { to: ["a@b.c"] }));
    await assertFails(getDocs(collection(dbAs(env, "root", "admin"), "mail")));
  });
});
