/**
 * Seeds the Firebase emulators with sample sites, spaces, departments, teams and users.
 * Idempotent: re-running updates the same documents.
 *
 *   npm run emulators   (in another terminal)
 *   npm run seed
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, Timestamp, getFirestore } from "firebase-admin/firestore";
import {
  COL,
  DEMO_ACCOUNTS,
  addDays,
  bookingCost,
  nowIn,
  weekdayOf,
  zonedTimeToUtc,
  type Booking,
  type Department,
  type OpeningHours,
  type Plan,
  type Role,
  type Site,
  type Space,
  type SpaceCategory,
  type Team,
  type UserProfile,
} from "../packages/shared/src/index";

const envFile = resolve(import.meta.dirname, "../apps/web/.env.local");
if (existsSync(envFile)) process.loadEnvFile(envFile);

const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "demo-reservation-espace";
const password = process.env.NEXT_PUBLIC_DEMO_PASSWORD;
if (!password || password.length < 6) {
  throw new Error("Set NEXT_PUBLIC_DEMO_PASSWORD (6+ characters) in apps/web/.env.local");
}

// Always target the emulators: the Admin SDK honours these variables and never reaches production.
process.env.FIRESTORE_EMULATOR_HOST ??= "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= "127.0.0.1:9099";

initializeApp({ projectId });
const db = getFirestore();
const auth = getAuth();

const OFFICE_HOURS: OpeningHours = {
  mon: [{ from: 480, to: 1140 }],
  tue: [{ from: 480, to: 1140 }],
  wed: [{ from: 480, to: 1140 }],
  thu: [{ from: 480, to: 1140 }],
  fri: [{ from: 480, to: 1080 }],
  sat: [],
  sun: [],
};

const DEPARTMENTS: Record<string, Department> = {
  it: { name: "Informatique" },
  produit: { name: "Produit" },
  rh: { name: "Ressources humaines" },
  finance: { name: "Finance" },
};

const TEAMS: Record<string, Team> = {
  "team-produit": {
    name: "Équipe Produit",
    departmentId: "produit",
    managerIds: ["demo-manager"],
    memberIds: ["demo-manager", "demo-user"],
  },
};

const SITES: Record<string, Site> = {
  paris: {
    name: "Paris – La Défense",
    address: "1 parvis de la Défense, 92800 Puteaux",
    timeZone: "Europe/Paris",
    floors: [
      { id: "1", label: "1er étage" },
      { id: "2", label: "2e étage" },
      { id: "3", label: "3e étage" },
    ],
    defaultOpeningHours: OFFICE_HOURS,
  },
  lyon: {
    name: "Lyon – Part-Dieu",
    address: "5 place Charles Béraudier, 69003 Lyon",
    timeZone: "Europe/Paris",
    floors: [
      { id: "0", label: "Rez-de-chaussée" },
      { id: "1", label: "1er étage" },
    ],
    defaultOpeningHours: OFFICE_HOURS,
  },
};

type SpaceSeed = Pick<Space, "siteId" | "floor" | "location" | "name" | "category" | "capacity" | "equipment" | "tags">;

function desks(siteId: string, floor: string, prefix: string, count: number, zone: string): [string, SpaceSeed][] {
  return Array.from({ length: count }, (_, i) => {
    const n = String(i + 1).padStart(2, "0");
    const quiet = zone === "Zone calme";
    return [
      `${siteId}-${prefix}${n}`,
      {
        siteId,
        floor,
        location: zone,
        name: `Poste ${prefix}${n}`,
        category: "desk" as SpaceCategory,
        capacity: 1,
        equipment: i % 2 === 0 ? ["screen", "dock"] : ["screen"],
        tags: [...(quiet ? ["quiet_zone"] : []), ...(i % 4 === 0 ? ["window"] : []), ...(i === 0 ? ["standing_desk"] : [])],
      },
    ];
  });
}

/** Credits charged per hour, by type of space. */
const CREDITS_PER_HOUR: Record<SpaceCategory, number> = {
  desk: 1,
  open_space: 1,
  coworking: 1,
  meeting_room: 4,
  phone_booth: 0,
};

const PLANS: Record<string, Plan> = {
  "pack-10": { name: "Pack 10 crédits", description: "Idéal pour quelques journées sur site.", kind: "pack", credits: 10, priceCents: 900, active: true },
  "pack-30": { name: "Pack 30 crédits", description: "Le meilleur prix par crédit.", kind: "pack", credits: 30, priceCents: 2400, active: true },
  "monthly-20": { name: "Abonnement mensuel", description: "20 crédits chaque mois.", kind: "subscription", credits: 20, priceCents: 1500, active: true },
  "legacy-5": { name: "Ancien pack 5 crédits", description: "Formule retirée de la vente.", kind: "pack", credits: 5, priceCents: 500, active: false },
};

const SPACES: [string, SpaceSeed][] = [
  ...desks("paris", "1", "1A-", 6, "Zone calme"),
  ...desks("paris", "2", "2B-", 6, "Plateau collaboratif"),
  ["paris-open-2", { siteId: "paris", floor: "2", location: "Plateau collaboratif", name: "Open space Seine", category: "open_space", capacity: 12, equipment: ["screen", "whiteboard"], tags: [] }],
  ["paris-salle-louvre", { siteId: "paris", floor: "1", location: "Aile nord", name: "Salle Louvre", category: "meeting_room", capacity: 8, equipment: ["videoconference", "screen", "whiteboard"], tags: ["accessible"] }],
  ["paris-salle-orsay", { siteId: "paris", floor: "1", location: "Aile sud", name: "Salle Orsay", category: "meeting_room", capacity: 4, equipment: ["screen"], tags: [] }],
  ["paris-salle-pompidou", { siteId: "paris", floor: "3", location: "Direction", name: "Salle Pompidou", category: "meeting_room", capacity: 16, equipment: ["videoconference", "projector", "whiteboard"], tags: ["accessible"] }],
  ["paris-cowork-3", { siteId: "paris", floor: "3", location: "Terrasse", name: "Coworking Terrasse", category: "coworking", capacity: 20, equipment: ["screen"], tags: ["window"] }],
  ["paris-cabine-1", { siteId: "paris", floor: "1", location: "Zone calme", name: "Cabine Molière", category: "phone_booth", capacity: 1, equipment: [], tags: ["quiet_zone"] }],
  ["paris-cabine-2", { siteId: "paris", floor: "2", location: "Plateau collaboratif", name: "Cabine Racine", category: "phone_booth", capacity: 1, equipment: [], tags: ["quiet_zone"] }],
  ...desks("lyon", "1", "L1-", 6, "Plateau"),
  ["lyon-salle-rhone", { siteId: "lyon", floor: "0", location: "Accueil", name: "Salle Rhône", category: "meeting_room", capacity: 10, equipment: ["videoconference", "screen"], tags: ["accessible"] }],
  ["lyon-salle-saone", { siteId: "lyon", floor: "1", location: "Plateau", name: "Salle Saône", category: "meeting_room", capacity: 6, equipment: ["screen", "whiteboard"], tags: [] }],
  ["lyon-cowork", { siteId: "lyon", floor: "0", location: "Accueil", name: "Coworking Confluence", category: "coworking", capacity: 15, equipment: [], tags: [] }],
];

const FIRST_NAMES = ["Emma", "Louis", "Chloé", "Gabriel", "Manon", "Raphaël", "Inès", "Arthur", "Jade", "Jules", "Alice", "Adam", "Lina", "Nathan", "Rose", "Tom", "Anna", "Paul", "Zoé", "Noah", "Sarah", "Victor"];
const LAST_NAMES = ["Martin", "Bernard", "Dubois", "Thomas", "Robert", "Richard", "Petit", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Lefebvre", "Michel", "Garcia", "David", "Bertrand", "Roux", "Vincent", "Fournier", "Morel", "Girard"];
const DEPT_IDS = Object.keys(DEPARTMENTS);

interface SeedUser {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  departmentId: string;
  teamIds: string[];
}

const COLLEAGUES: SeedUser[] = FIRST_NAMES.map((first, i) => {
  const last = LAST_NAMES[i]!;
  const slug = `${first}.${last}`.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return {
    uid: `demo-colleague-${i + 1}`,
    email: `${slug}@exemple.fr`,
    displayName: `${first} ${last}`,
    role: "user",
    departmentId: DEPT_IDS[i % DEPT_IDS.length]!,
    teamIds: [],
  };
});

// Left the company: disabled by the directory sync (admin → Utilisateurs → Synchroniser l'annuaire).
const DEPARTED: SeedUser = {
  uid: "demo-departed",
  email: "ancien@exemple.fr",
  displayName: "Marc Ancien",
  role: "user",
  departmentId: "finance",
  teamIds: [],
};

async function upsertAuthUser(u: SeedUser) {
  const props = { email: u.email, displayName: u.displayName, password, emailVerified: true, disabled: false };
  try {
    await auth.updateUser(u.uid, props);
  } catch {
    await auth.createUser({ uid: u.uid, ...props });
  }
  await auth.setCustomUserClaims(u.uid, { role: u.role });
}

async function main() {
  console.log(`Seeding emulators for project ${projectId}…`);
  const batch = db.batch();
  const now = FieldValue.serverTimestamp();

  for (const [id, d] of Object.entries(DEPARTMENTS)) batch.set(db.collection(COL.departments).doc(id), d);
  for (const [id, t] of Object.entries(TEAMS)) batch.set(db.collection(COL.teams).doc(id), t);
  for (const [id, s] of Object.entries(SITES)) batch.set(db.collection(COL.sites).doc(id), s);
  for (const [id, s] of SPACES) {
    const space: Space<FieldValue> = {
      ...s,
      creditsPerHour: CREDITS_PER_HOUR[s.category],
      openingHours: SITES[s.siteId]!.defaultOpeningHours,
      status: "active",
      closures: [],
      createdAt: now,
      updatedAt: now,
    };
    batch.set(db.collection(COL.spaces).doc(id), space);
  }
  batch.set(db.collection("config").doc("directoryStub"), { departedEmails: [DEPARTED.email] });

  const users: SeedUser[] = [...DEMO_ACCOUNTS, ...COLLEAGUES, DEPARTED];
  for (const u of users) {
    await upsertAuthUser(u);
    const profile: UserProfile<FieldValue> = {
      email: u.email,
      displayName: u.displayName,
      photoURL: null,
      departmentId: u.departmentId,
      teamIds: u.teamIds,
      defaultSiteId: "paris",
      role: u.role,
      status: "active",
      notificationPrefs: { email: true, push: false, weeklyDigest: false },
      locale: "fr",
      claimsUpdatedAt: now,
      lastLoginAt: null,
      createdAt: now,
    };
    batch.set(db.collection(COL.users).doc(u.uid), profile);
  }


  // ---------- Credits, plans, bookings and support requests ----------
  for (const [id, plan] of Object.entries(PLANS)) batch.set(db.collection(COL.plans).doc(id), plan);

  const balances = new Map<string, number>();
  const credit = (uid: string, amount: number, type: string, label: string, id: string, bookingId?: string) => {
    const balanceAfter = (balances.get(uid) ?? 0) + amount;
    balances.set(uid, balanceAfter);
    batch.set(db.collection(COL.creditTransactions).doc(id), { userId: uid, type, amount, balanceAfter, label, bookingId: bookingId ?? null, createdAt: now });
  };
  for (const u of users) {
    if (u.uid === DEPARTED.uid) continue;
    credit(u.uid, u.uid.startsWith("demo-colleague") ? 12 : 30, "adjustment", "Crédits de bienvenue", `seed-welcome-${u.uid}`);
  }

  const today = nowIn("Europe/Paris").date;
  const workday = (offset: number) => {
    let date = addDays(today, offset);
    while (["sat", "sun"].includes(weekdayOf(date))) date = addDays(date, offset < 0 ? -1 : 1);
    return date;
  };
  const [tomorrow, inTwoDays, lastWeek] = [workday(1), workday(2), workday(-4)];

  let bookingCount = 0;
  const book = (user: SeedUser, spaceId: string, date: string, from: number, to: number, attendees = 1) => {
    const space = SPACES.find(([id]) => id === spaceId)![1];
    bookingCount += 1;
    const id = `seed-booking-${bookingCount}`;
    const cost = bookingCost(CREDITS_PER_HOUR[space.category], { from, to });
    const booking: Booking<FieldValue | Timestamp> = {
      userId: user.uid,
      userName: user.displayName,
      teamIds: user.teamIds,
      spaceId,
      spaceName: space.name,
      siteId: space.siteId,
      date,
      from,
      to,
      attendees,
      startsAt: Timestamp.fromDate(zonedTimeToUtc(date, from, SITES[space.siteId]!.timeZone)),
      status: "confirmed",
      credits: cost,
      cancelledBy: null,
      cancelReason: null,
      reminderSent: false,
      createdAt: now,
      updatedAt: now,
    };
    batch.set(db.collection(COL.bookings).doc(id), booking);
    if (cost > 0) credit(user.uid, -cost, "booking", space.name, `seed-booking-tx-${bookingCount}`, id);
  };

  const demoUser = DEMO_ACCOUNTS.find((a) => a.uid === "demo-user")!;
  const demoManager = DEMO_ACCOUNTS.find((a) => a.uid === "demo-manager")!;
  book(demoUser, "paris-1A-01", tomorrow, 9 * 60, 17 * 60);
  book(demoUser, "paris-salle-orsay", inTwoDays, 10 * 60, 11 * 60 + 30, 3);
  book(demoUser, "paris-1A-02", lastWeek, 9 * 60, 12 * 60);
  book(demoManager, "paris-2B-03", tomorrow, 8 * 60 + 30, 12 * 60 + 30);
  book(COLLEAGUES[0]!, "paris-2B-01", tomorrow, 9 * 60, 18 * 60);
  book(COLLEAGUES[1]!, "paris-2B-02", tomorrow, 9 * 60, 13 * 60);
  book(COLLEAGUES[2]!, "paris-open-2", tomorrow, 9 * 60, 17 * 60);
  book(COLLEAGUES[3]!, "paris-open-2", tomorrow, 13 * 60, 17 * 60);
  book(COLLEAGUES[4]!, "paris-salle-louvre", tomorrow, 14 * 60, 16 * 60, 6);

  batch.set(db.collection(COL.subscriptions).doc("seed-subscription-1"), {
    userId: demoManager.uid,
    planId: "monthly-20",
    planName: PLANS["monthly-20"]!.name,
    credits: 20,
    status: "active",
    nextRenewalAt: Timestamp.fromDate(new Date(Date.now() + 25 * 86_400_000)),
    createdAt: now,
    cancelledAt: null,
  });
  credit(demoManager.uid, 20, "subscription", PLANS["monthly-20"]!.name, "seed-subscription-tx-1");

  for (const [uid, balance] of balances) batch.set(db.collection(COL.wallets).doc(uid), { balance, updatedAt: now });

  batch.set(db.collection(COL.absences).doc("seed-absence-1"), {
    userId: COLLEAGUES[5]!.uid,
    userName: COLLEAGUES[5]!.displayName,
    from: workday(8),
    to: workday(9),
    note: "Congés",
    createdAt: now,
  });

  const inbox = db.collection(COL.users).doc(demoUser.uid).collection(COL.notifications);
  batch.set(inbox.doc("seed-notification-1"), {
    type: "bookingConfirmed",
    title: "Réservation confirmée",
    body: "Poste 1A-01 · de 09:00 à 17:00",
    link: "/mes-reservations",
    readAt: null,
    createdAt: now,
  });
  batch.set(inbox.doc("seed-notification-2"), {
    type: "creditsAdded",
    title: "Crédits ajoutés",
    body: "30 crédits ont été ajoutés à votre solde (Crédits de bienvenue).",
    link: "/credits",
    readAt: null,
    createdAt: now,
  });

  batch.set(db.collection(COL.incidents).doc("seed-incident-1"), {
    reporterId: demoUser.uid,
    reporterName: demoUser.displayName,
    spaceId: "paris-1A-03",
    spaceName: "Poste 1A-03",
    title: "Écran qui clignote",
    description: "L'écran du poste s'éteint de temps en temps depuis lundi.",
    photoPaths: [],
    status: "in_progress",
    adminNote: "Un technicien passe demain matin.",
    createdAt: now,
    updatedAt: now,
  });
  batch.set(db.collection(COL.incidents).doc("seed-incident-2"), {
    reporterId: COLLEAGUES[0]!.uid,
    reporterName: COLLEAGUES[0]!.displayName,
    spaceId: "paris-salle-louvre",
    spaceName: "Salle Louvre",
    title: "Marqueurs du tableau blanc vides",
    description: "Il n'y a plus de marqueurs dans la salle.",
    photoPaths: [],
    status: "open",
    adminNote: "",
    createdAt: now,
    updatedAt: now,
  });
  batch.set(db.collection(COL.equipmentRequests).doc("seed-request-1"), {
    requesterId: demoUser.uid,
    requesterName: demoUser.displayName,
    item: "mouse",
    quantity: 1,
    neededOn: tomorrow,
    comment: "Souris sans fil si possible.",
    status: "pending",
    adminNote: "",
    createdAt: now,
    updatedAt: now,
  });

  await batch.commit();
  console.log(
    `✓ ${Object.keys(SITES).length} sites, ${SPACES.length} spaces, ${Object.keys(DEPARTMENTS).length} departments, ` +
      `${Object.keys(TEAMS).length} team, ${users.length} users, ${bookingCount} bookings, ${Object.keys(PLANS).length} plans`,
  );
  console.log("Demo accounts:", DEMO_ACCOUNTS.map((a) => `${a.email} (${a.role})`).join(", "));
  console.log("Password: NEXT_PUBLIC_DEMO_PASSWORD from apps/web/.env.local");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
