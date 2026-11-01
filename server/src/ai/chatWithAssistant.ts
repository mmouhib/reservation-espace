import { streamText } from "ai";
import { chatWithAssistantInput, type ChatWithAssistantResult } from "@reservation/shared";
import { secureStream } from "../lib/callable";
import { appError } from "../lib/errors";
import { logger } from "../lib/logger";
import { geminiModel } from "./gemini";

const SYSTEM_PROMPT = `You are the in-app assistant of a workspace-booking PWA (desks, meeting rooms and
coworking spaces, paid with credits bought as packs or monthly subscriptions). Help users find and
book a space, explain credits, plans, equipment requests and incident reports, and answer general
questions about using the app. You cannot look up a user's real bookings or balance or perform any
action yourself: point them to the relevant screen (Réserver, Mes réservations, Crédits, Support).
Reply in the same language the user writes in (French or English), concisely (a few sentences).`;

/** Any signed-in user: a streaming shopping-assistant-style chat backed by Gemini. */
export const chatWithAssistant = secureStream(
  { name: "chatWithAssistant", schema: chatWithAssistantInput, rateLimit: { limit: 15, windowSec: 60 } },
  async ({ data, send }): Promise<ChatWithAssistantResult> => {
    try {
      const result = streamText({
        model: geminiModel(),
        system: SYSTEM_PROMPT,
        messages: data.messages,
      });
      for await (const delta of result.textStream) send(delta);
      return { reply: await result.text };
    } catch (err) {
      logger.error("chatWithAssistant failed", { err });
      throw appError("internal", "assistantUnavailable", "Gemini request failed.");
    }
  },
);
