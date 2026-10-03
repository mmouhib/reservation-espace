import { Suspense } from "react";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { Spinner } from "@/components/ui/Spinner";
import { LoginView } from "./LoginView";

export default function ConnexionPage() {
  return (
    <>
      {/* Outside the boundary: a <title> in a Suspense fallback is not prerendered. */}
      <DocumentTitle titleKey="login.title" />
      {/* useSearchParams needs a Suspense boundary in a static export. */}
      <Suspense fallback={<Spinner />}>
        <LoginView />
      </Suspense>
    </>
  );
}
