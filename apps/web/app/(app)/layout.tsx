"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { Spinner } from "@/components/ui/Spinner";
import { useAuth } from "@/lib/auth/AuthProvider";

/**
 * Client-side guard for authenticated pages. This only drives the UI: data is
 * protected by Firestore rules and custom claims, not by this redirect.
 */
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { status, role } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "signed-out") router.replace(`/connexion?next=${encodeURIComponent(pathname)}`);
  }, [status, pathname, router]);

  if (status !== "signed-in" || !role) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    );
  }
  return <AppShell>{children}</AppShell>;
}
