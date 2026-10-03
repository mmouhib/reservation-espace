import type { Role } from "./roles";

/** Accounts created by the seed script in the emulators. Never used against a real project. */
export interface DemoAccount {
  uid: string;
  email: string;
  displayName: string;
  role: Role;
  departmentId: string;
  teamIds: string[];
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { uid: "demo-admin", email: "admin@exemple.fr", displayName: "Camille Admin", role: "admin", departmentId: "it", teamIds: [] },
  { uid: "demo-manager", email: "manager@exemple.fr", displayName: "Hugo Manager", role: "manager", departmentId: "produit", teamIds: ["team-produit"] },
  { uid: "demo-user", email: "user@exemple.fr", displayName: "Léa Collaboratrice", role: "user", departmentId: "produit", teamIds: ["team-produit"] },
];
