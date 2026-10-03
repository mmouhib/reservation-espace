"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { UpdateToast } from "@/components/pwa/UpdateToast";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <PwaProvider>
      <AuthProvider>{children}</AuthProvider>
      <UpdateToast />
    </PwaProvider>
  );
}
