import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Administration" };

const SECTIONS = [
  { href: "/admin/utilisateurs", title: "Utilisateurs", text: "Rôles, comptes désactivés, synchronisation annuaire.", ready: true },
  { href: "#", title: "Espaces", text: "Sites, étages, espaces, horaires et fermetures.", ready: false, phase: 2 },
  { href: "#", title: "Réservations", text: "Libération forcée, déplacement, absences.", ready: false, phase: 2 },
  { href: "#", title: "Crédits et abonnements", text: "Tarifs, formules, recharges.", ready: false, phase: 4 },
  { href: "#", title: "Signalements et matériel", text: "Incidents et demandes de matériel.", ready: false, phase: 5 },
  { href: "#", title: "Tableaux de bord", text: "Occupation, utilisation, exports, journal d'audit.", ready: false, phase: 6 },
];

export default function AdminPage() {
  return (
    <>
      <PageHeader title="Administration" />
      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map((s) => (
          <li key={s.title}>
            {s.ready ? (
              <Link
                href={s.href}
                className="block h-full rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-brand-600"
              >
                <span className="font-semibold text-brand-800">{s.title}</span>
                <span className="mt-1 block text-sm text-slate-600">{s.text}</span>
              </Link>
            ) : (
              <div className="h-full rounded-xl border border-dashed border-slate-300 bg-white p-5" aria-disabled="true">
                <span className="font-semibold text-slate-700">{s.title}</span>
                <span className="mt-1 block text-sm text-slate-600">{s.text}</span>
                <span className="mt-2 block text-xs text-slate-500">Bientôt disponible (phase {s.phase})</span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
