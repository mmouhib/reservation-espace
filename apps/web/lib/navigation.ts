import type { MessageKey, Role } from "@reservation/shared";
import type { IconName } from "@/components/ui/Icon";

export type { IconName };

export interface NavItem {
  href: string;
  labelKey: MessageKey;
  /** A shorter label for the narrow bottom bar of phones. */
  shortLabelKey?: MessageKey;
  /** Description shown on the home page shortcuts. */
  descriptionKey: MessageKey | null;
  icon: IconName;
  minRole: Role;
  /** Shown in the mobile bottom bar (max 5 items). */
  mobile: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", labelKey: "nav.home", descriptionKey: null, icon: "home", minRole: "user", mobile: true },
  { href: "/reserver", labelKey: "nav.reserve", descriptionKey: "home.shortcuts.reserve", icon: "calendar-plus", minRole: "user", mobile: true },
  { href: "/mes-reservations", labelKey: "nav.myBookings", shortLabelKey: "nav.myBookingsShort", descriptionKey: "home.shortcuts.myBookings", icon: "list", minRole: "user", mobile: true },
  { href: "/equipe", labelKey: "nav.team", descriptionKey: "home.shortcuts.team", icon: "users", minRole: "manager", mobile: false },
  { href: "/credits", labelKey: "nav.credits", descriptionKey: "home.shortcuts.credits", icon: "wallet", minRole: "user", mobile: true },
  { href: "/support", labelKey: "nav.support", descriptionKey: "home.shortcuts.support", icon: "lifebuoy", minRole: "user", mobile: false },
  { href: "/profil", labelKey: "nav.profile", descriptionKey: "home.shortcuts.profile", icon: "user", minRole: "user", mobile: true },
  { href: "/admin", labelKey: "nav.admin", descriptionKey: "home.shortcuts.admin", icon: "shield", minRole: "admin", mobile: false },
];

export function isActive(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
