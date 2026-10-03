import type { Metadata } from "next";
import { ComingSoon, PageHeader } from "@/components/ui/PageHeader";

export const metadata: Metadata = { title: "Réserver" };

export default function ReserverPage() {
  return (
    <>
      <PageHeader title="Réserver un espace" description="Recherchez par site, capacité, équipement et date." />
      <ComingSoon phase={2} />
    </>
  );
}
