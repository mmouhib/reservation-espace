import type { Role } from "@reservation/shared";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  minRole: Role;
  /** Shown in the mobile bottom bar (max 4–5 items). */
  mobile: boolean;
}

export type IconName = "home" | "calendar-plus" | "list" | "user" | "shield";

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Accueil", icon: "home", minRole: "user", mobile: true },
  { href: "/reserver", label: "Réserver", icon: "calendar-plus", minRole: "user", mobile: true },
  { href: "/mes-reservations", label: "Mes réservations", icon: "list", minRole: "user", mobile: true },
  { href: "/profil", label: "Profil", icon: "user", minRole: "user", mobile: true },
  { href: "/admin", label: "Administration", icon: "shield", minRole: "admin", mobile: false },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
