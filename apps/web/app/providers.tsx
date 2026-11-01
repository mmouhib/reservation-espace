"use client";

import type { ReactNode } from "react";
import { ProfileLocaleSync } from "@/components/i18n/ProfileLocaleSync";
import { PwaProvider } from "@/components/pwa/PwaProvider";
import { UpdateToast } from "@/components/pwa/UpdateToast";
import { FlashProvider } from "@/components/ui/Flash";
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { I18nProvider } from "@/lib/i18n/I18nProvider";
import { ThemeProvider } from "@/lib/theme/ThemeProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <FlashProvider>
          <PwaProvider>
            <AuthProvider>
              <ProfileLocaleSync />
              {children}
            </AuthProvider>
            <UpdateToast />
          </PwaProvider>
        </FlashProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
