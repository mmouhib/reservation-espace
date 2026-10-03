import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { ProfileView } from "./ProfileView";

export const metadata: Metadata = { title: "Profil" };

export default function ProfilPage() {
  return (
    <>
      <PageHeader title="Mon profil" description="Vos informations et vos préférences." />
      <ProfileView />
    </>
  );
}
