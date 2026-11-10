"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessageInput } from "@reservation/shared";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { api } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : String(Math.random());
}

/** A floating assistant that answers questions about booking spaces, credits and support (Gemini, streamed). */
export function ChatBot() {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const history = [...messages, { id: newId(), role: "user" as const, content: text }];
    setMessages(history);
    setInput("");
    setIsLoading(true);

    try {
      const payload: ChatMessageInput[] = history.map(({ role, content }) => ({ role, content }));
      const { stream, data } = await api.chatWithAssistant(payload);
      // `data` rejects alongside the stream on failure; observe it now so it never surfaces as an unhandled rejection.
      data.catch(() => {});
      const assistantId = newId();
      let assistantText = "";
      const show = (content: string) =>
        setMessages((current) => {
          const exists = current.some((m) => m.id === assistantId);
          return exists
            ? current.map((m) => (m.id === assistantId ? { ...m, content } : m))
            : [...current, { id: assistantId, role: "assistant", content }];
        });
      for await (const chunk of stream) {
        assistantText += chunk;
        show(assistantText);
      }
      const { reply } = await data;
      if (reply && reply !== assistantText) show(reply);
    } catch {
      setMessages((current) => [...current, { id: newId(), role: "assistant", content: t("assistant.error") }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="fixed bottom-20 end-4 z-40 md:bottom-4">
      {isOpen ? (
        <div className="flex h-[28rem] w-80 max-w-[calc(100vw-2rem)] flex-col rounded-xl border border-slate-200 bg-white shadow-2xl sm:w-96">
          <div className="flex items-center justify-between gap-2 rounded-t-xl bg-brand-700 px-4 py-3 text-white">
            <h2 className="text-sm font-semibold">{t("assistant.title")}</h2>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label={t("assistant.closeLabel")}
              className="rounded p-1 hover:bg-white/10"
            >
              <Icon name="x" className="size-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-3">
            {messages.length === 0 && <p className="mt-4 text-center text-sm text-slate-600">{t("assistant.greeting")}</p>}
            {messages.map((m) => (
              <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                <p
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                    m.role === "user" ? "rounded-br-sm bg-brand-700 text-white" : "rounded-bl-sm bg-slate-100 text-slate-900",
                  )}
                >
                  {m.content}
                </p>
              </div>
            ))}
            {isLoading && messages.at(-1)?.role !== "assistant" && <p className="text-xs text-slate-500">{t("assistant.typing")}</p>}
            <div ref={endRef} />
          </div>

          <form onSubmit={(e) => void handleSubmit(e)} className="flex gap-2 border-t border-slate-200 p-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("assistant.placeholder")}
              aria-label={t("assistant.placeholder")}
              className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 text-sm placeholder:text-slate-400 focus:border-brand-600 focus:outline-none"
            />
            <Button type="submit" size="sm" disabled={isLoading || !input.trim()}>
              {t("assistant.send")}
            </Button>
          </form>
        </div>
      ) : (
        <Button
          onClick={() => setIsOpen(true)}
          aria-label={t("assistant.openLabel")}
          className="size-14 rounded-full p-0 shadow-lg hover:scale-105"
        >
          <Icon name="message-circle" className="size-6" />
        </Button>
      )}
    </div>
  );
}
