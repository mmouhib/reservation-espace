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
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  COL,
  DEMO_ACCOUNTS,
  type Department,
  type OpeningHours,
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

  await batch.commit();
  console.log(
    `✓ ${Object.keys(SITES).length} sites, ${SPACES.length} spaces, ${Object.keys(DEPARTMENTS).length} departments, ` +
      `${Object.keys(TEAMS).length} team, ${users.length} users`,
  );
  console.log("Demo accounts:", DEMO_ACCOUNTS.map((a) => `${a.email} (${a.role})`).join(", "));
  console.log("Password: NEXT_PUBLIC_DEMO_PASSWORD from apps/web/.env.local");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
