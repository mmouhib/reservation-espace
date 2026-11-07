"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { DocumentTitle } from "@/components/i18n/DocumentTitle";
import { AppShell } from "@/components/layout/AppShell";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * Client-side guard for authenticated pages. This only drives the UI: data is
 * protected by the server (sign-in token and role checks), not by this redirect.
 */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { status, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // The query string is kept: a scanned QR code opens /checkin?space=..., and signing in must bring the person back to it.
    if (status === "signed-out" || status === "unverified") router.replace(`/connexion?next=${encodeURIComponent(pathname + window.location.search)}`);
  }, [status, pathname, router]);

  if (status !== "signed-in" || !role) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        {/* Pages render their own title once signed in; this one is also the prerendered title. */}
        <DocumentTitle />
        <Spinner />
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
