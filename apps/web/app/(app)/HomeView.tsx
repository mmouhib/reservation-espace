"use client";

import Link from "next/link";
import { hasRole } from "@reservation/shared";
import { Icon } from "@/components/ui/Icon";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/auth/AuthProvider";
import { NAV_ITEMS } from "@/lib/navigation";

const DESCRIPTIONS: Record<string, string> = {
  "/reserver": "Trouvez un poste, une salle ou un espace de coworking disponible.",
  "/mes-reservations": "Consultez, modifiez ou annulez vos réservations, même hors ligne.",
  "/profil": "Vos informations et vos préférences de notification.",
  "/admin": "Espaces, utilisateurs, modération et statistiques.",
};

export function HomeView() {
  const { profile, role } = useAuth();
  const firstName = profile?.displayName.split(" ")[0];
  const shortcuts = NAV_ITEMS.filter((i) => i.href !== "/" && role && hasRole(role, i.minRole));

  return (
    <>
      <PageHeader title={firstName ? `Bonjour ${firstName}` : "Bonjour"} description="Que souhaitez-vous faire aujourd'hui ?" />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="flex h-full flex-col gap-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-600 hover:shadow"
            >
              <span className="flex items-center gap-2 font-semibold text-brand-800">
                <Icon name={item.icon} />
                {item.label}
              </span>
              <span className="text-sm text-slate-600">{DESCRIPTIONS[item.href]}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section aria-labelledby="upcoming" className="mt-10">
        <h2 id="upcoming" className="mb-3 text-lg font-semibold">
          Prochaines réservations
        </h2>
        <p className="rounded-xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          Aucune réservation à venir.
        </p>
      </section>
    </>
  );
}
