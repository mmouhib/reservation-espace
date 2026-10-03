import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Mes réservations" };

export default function MesReservationsPage() {
  return (
    <>
      <PageHeader title="Mes réservations" description="Vos réservations à venir et votre historique." />
      <ComingSoon phase={2} />
    </>
  );
}
