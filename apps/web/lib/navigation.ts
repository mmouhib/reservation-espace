import type { MessageKey, Role } from "@reservation/shared";

export interface NavItem {
  href: string;
  labelKey: MessageKey;
  /** Description shown on the home page shortcuts. */
  descriptionKey: MessageKey | null;
  icon: IconName;
  minRole: Role;
  /** Shown in the mobile bottom bar (max 4–5 items). */
  mobile: boolean;
}

export type IconName = "home" | "calendar-plus" | "list" | "user" | "shield";

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.home", descriptionKey: null, icon: "home", minRole: "user", mobile: true },
  { href: "/reserver", labelKey: "nav.reserve", descriptionKey: "home.shortcuts.reserve", icon: "calendar-plus", minRole: "user", mobile: true },
  { href: "/mes-reservations", labelKey: "nav.myBookings", descriptionKey: "home.shortcuts.myBookings", icon: "list", minRole: "user", mobile: true },
  { href: "/profil", labelKey: "nav.profile", descriptionKey: "home.shortcuts.profile", icon: "user", minRole: "user", mobile: true },
  { href: "/admin", labelKey: "nav.admin", descriptionKey: "home.shortcuts.admin", icon: "shield", minRole: "admin", mobile: false },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
