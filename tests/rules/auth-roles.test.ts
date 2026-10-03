import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, serverTimestamp, setDoc, updateDoc } from "firebase/firestore";
import { createTestEnv, dbAs } from "./setup";

let env: RulesTestEnvironment;

const profile = (role: string) => ({
  email: "alice@exemple.fr",
  displayName: "Alice",
  photoURL: null,
  departmentId: null,
  teamIds: [],
  defaultSiteId: null,
  role,
  status: "active",
  notificationPrefs: { email: true, push: false, weeklyDigest: false },
  locale: "fr",
  claimsUpdatedAt: null,
  lastLoginAt: null,
  createdAt: new Date(),
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
    await setDoc(doc(db, "users/alice"), profile("user"));
    await setDoc(doc(db, "users/bob"), { ...profile("user"), email: "bob@exemple.fr", displayName: "Bob" });
    await setDoc(doc(db, "users/alice/notifications/n1"), { title: "Bienvenue", readAt: null });
    await setDoc(doc(db, "sites/paris"), { name: "Paris" });
    await setDoc(doc(db, "auditLogs/a1"), { action: "user.created" });
  });
});

describe("non-bootstrapped accounts (no role claim)", () => {
  it("cannot read anything, even their own profile", async () => {
    const db = dbAs(env, "alice");
    await assertFails(getDoc(doc(db, "users/alice")));
    await assertFails(getDoc(doc(db, "sites/paris")));
  });

  it("unauthenticated users are denied", async () => {
    const db = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(db, "sites/paris")));
  });
});

describe("users/{uid}", () => {
  it("a user reads their own profile but not someone else's", async () => {
    const db = dbAs(env, "alice", "user");
    await assertSucceeds(getDoc(doc(db, "users/alice")));
    await assertFails(getDoc(doc(db, "users/bob")));
  });

  it("an admin reads any profile and lists users", async () => {
    const db = dbAs(env, "root", "admin");
    await assertSucceeds(getDoc(doc(db, "users/bob")));
    await assertSucceeds(getDocs(collection(db, "users")));
  });

  it("a user cannot list all users", async () => {
    await assertFails(getDocs(collection(dbAs(env, "alice", "user"), "users")));
  });

  it("a user can update allowed fields with valid values", async () => {
    const db = dbAs(env, "alice", "user");
    await assertSucceeds(
      updateDoc(doc(db, "users/alice"), {
        displayName: "Alice M.",
        notificationPrefs: { email: false, push: true, weeklyDigest: true },
      }),
    );
  });

  it("a user cannot escalate their role or change their status", async () => {
    const db = dbAs(env, "alice", "user");
    await assertFails(updateDoc(doc(db, "users/alice"), { role: "admin" }));
    await assertFails(updateDoc(doc(db, "users/alice"), { status: "disabled" }));
    await assertFails(updateDoc(doc(db, "users/alice"), { teamIds: ["t1"] }));
  });

  it("rejects malformed notification preferences", async () => {
    const db = dbAs(env, "alice", "user");
    await assertFails(updateDoc(doc(db, "users/alice"), { notificationPrefs: { email: "yes" } }));
  });

  it("a user can switch their language between supported locales only", async () => {
    const db = dbAs(env, "alice", "user");
    await assertSucceeds(updateDoc(doc(db, "users/alice"), { locale: "en" }));
    await assertFails(updateDoc(doc(db, "users/alice"), { locale: "de" }));
    await assertFails(updateDoc(doc(db, "users/alice"), { locale: 1 }));
    await assertFails(updateDoc(doc(dbAs(env, "bob", "user"), "users/alice"), { locale: "fr" }));
  });

  it("profiles created before the locale field can still be updated", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const { locale: _omitted, ...legacy } = profile("user");
      await setDoc(doc(ctx.firestore(), "users/alice"), legacy);
    });
    await assertSucceeds(updateDoc(doc(dbAs(env, "alice", "user"), "users/alice"), { displayName: "Alice L." }));
  });

  it("nobody creates or deletes profiles from the client, not even admins", async () => {
    const db = dbAs(env, "root", "admin");
    await assertFails(setDoc(doc(db, "users/eve"), profile("admin")));
    await assertFails(deleteDoc(doc(db, "users/bob")));
  });
});

describe("users/{uid}/devices and notifications", () => {
  it("a user registers their own device token", async () => {
    const db = dbAs(env, "alice", "user");
    await assertSucceeds(
      setDoc(doc(db, "users/alice/devices/d1"), {
        fcmToken: "token",
        platform: "web",
        userAgent: "test",
        lastSeenAt: serverTimestamp(),
      }),
    );
  });

  it("a user cannot register a device on someone else's profile", async () => {
    const db = dbAs(env, "bob", "user");
    await assertFails(
      setDoc(doc(db, "users/alice/devices/d1"), {
        fcmToken: "token",
        platform: "web",
        userAgent: "test",
        lastSeenAt: serverTimestamp(),
      }),
    );
  });

  it("a user can only mark notifications as read", async () => {
    const db = dbAs(env, "alice", "user");
    await assertSucceeds(updateDoc(doc(db, "users/alice/notifications/n1"), { readAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(db, "users/alice/notifications/n1"), { title: "Hacked" }));
    await assertFails(addDoc(collection(db, "users/alice/notifications"), { title: "Fake" }));
  });
});

describe("reference data", () => {
  it("members read sites; only admins write them", async () => {
    await assertSucceeds(getDoc(doc(dbAs(env, "alice", "user"), "sites/paris")));
    await assertFails(setDoc(doc(dbAs(env, "alice", "user"), "sites/lyon"), { name: "Lyon" }));
    await assertFails(setDoc(doc(dbAs(env, "mgr", "manager"), "sites/lyon"), { name: "Lyon" }));
    await assertSucceeds(setDoc(doc(dbAs(env, "root", "admin"), "sites/lyon"), { name: "Lyon" }));
  });
});

describe("server-owned collections", () => {
  it("audit logs are readable by admins only and never writable", async () => {
    await assertFails(getDoc(doc(dbAs(env, "alice", "user"), "auditLogs/a1")));
    await assertSucceeds(getDoc(doc(dbAs(env, "root", "admin"), "auditLogs/a1")));
    await assertFails(addDoc(collection(dbAs(env, "root", "admin"), "auditLogs"), { action: "forged" }));
  });

  it("rate-limit and config documents are not accessible", async () => {
    const db = dbAs(env, "root", "admin");
    await assertFails(getDoc(doc(db, "_rateLimits/alice_setUserRole")));
    await assertFails(getDoc(doc(db, "config/directoryStub")));
  });
});
