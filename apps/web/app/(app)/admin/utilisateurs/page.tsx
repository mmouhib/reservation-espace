import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { UsersAdmin } from "./UsersAdmin";

export const metadata: Metadata = { title: "Utilisateurs" };

export default function UtilisateursPage() {
  return (
    <>
      <PageHeader title="Utilisateurs" description="Gérez les rôles et les comptes des collaborateurs." />
      <UsersAdmin />
    </>
  );
}
