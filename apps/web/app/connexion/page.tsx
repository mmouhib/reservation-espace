import type { Metadata } from "next";
import { Suspense } from "react";
import { Spinner } from "@/components/ui/Spinner";
import { LoginView } from "./LoginView";

export const metadata: Metadata = { title: "Connexion" };

export default function ConnexionPage() {
  return (
    // useSearchParams needs a Suspense boundary in a static export.
    <Suspense fallback={<Spinner />}>
      <LoginView />
    </Suspense>
  );
}
