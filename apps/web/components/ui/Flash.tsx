"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { MessageKey, MessageValues } from "@reservation/shared";
import { errorKey } from "@/lib/api/functions";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { cn } from "@/lib/cn";
import { Icon } from "./Icon";

interface FlashMessage {
  id: number;
  kind: "ok" | "error";
  text: string;
}

interface FlashApi {
  success: (key: MessageKey, values?: MessageValues) => void;
  /** An error message for a caught error (see errorKey). */
  error: (err: unknown) => void;
  /** An error message known in advance. */
  failure: (key: MessageKey) => void;
}

const FlashContext = createContext<FlashApi | null>(null);
const DURATION_MS = 5000;
let nextId = 1;

/** Short messages shown over the page after an action ("Booking confirmed", an error...). */
export function FlashProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const [messages, setMessages] = useState<FlashMessage[]>([]);

  const show = useCallback((kind: FlashMessage["kind"], text: string) => {
    const id = nextId++;
    setMessages((current) => [...current, { id, kind, text }]);
    window.setTimeout(() => setMessages((current) => current.filter((m) => m.id !== id)), DURATION_MS);
  }, []);

  const api = useMemo<FlashApi>(
    () => ({
      success: (key, values) => show("ok", t(key, values)),
      error: (err) => show("error", t(errorKey(err))),
      failure: (key) => show("error", t(key)),
    }),
    [show, t],
  );

  return (
    <FlashContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 top-16 z-[60] flex flex-col items-center gap-2 px-4">
        {messages.map((m) => (
          <p
            key={m.id}
            role={m.kind === "error" ? "alert" : "status"}
            className={cn(
              "pointer-events-auto flex max-w-md items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-lg",
              m.kind === "error" ? "bg-red-700 text-white" : "bg-slate-900 text-white",
            )}
          >
            <Icon name={m.kind === "error" ? "alert" : "check"} className="size-4 shrink-0" />
            {m.text}
          </p>
        ))}
      </div>
    </FlashContext.Provider>
  );
}

export function useFlash(): FlashApi {
  const ctx = useContext(FlashContext);
  if (!ctx) throw new Error("useFlash must be used inside <FlashProvider>");
  return ctx;
}
