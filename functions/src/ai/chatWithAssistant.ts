import { streamText } from "ai";
import { onCall } from "firebase-functions/v2/https";
import { logger } from "firebase-functions/v2";
import { chatWithAssistantInput, type ChatWithAssistantResult } from "@reservation/shared";
import { authorize } from "../lib/callable";
import { ENFORCE_APP_CHECK, GOOGLE_GENERATIVE_AI_API_KEY, REGION } from "../lib/config";
import { appError } from "../lib/errors";
import { geminiModel } from "./gemini";

const SYSTEM_PROMPT = `You are the in-app assistant of a workspace-booking PWA (desks, meeting rooms and
coworking spaces, paid with credits bought as packs or monthly subscriptions). Help users find and
book a space, explain credits, plans, equipment requests and incident reports, and answer general
questions about using the app. You cannot look up a user's real bookings or balance or perform any
action yourself: point them to the relevant screen (Réserver, Mes réservations, Crédits, Support).
Reply in the same language the user writes in (French or English), concisely (a few sentences).`;

/** Any signed-in user: a streaming shopping-assistant-style chat backed by Gemini. */
export const chatWithAssistant = onCall<unknown, Promise<ChatWithAssistantResult>, string>(
  { region: REGION, enforceAppCheck: ENFORCE_APP_CHECK, secrets: [GOOGLE_GENERATIVE_AI_API_KEY] },
  async (request, response) => {
    const { data } = await authorize(request, {
      name: "chatWithAssistant",
      schema: chatWithAssistantInput,
      rateLimit: { limit: 15, windowSec: 60 },
    });

    try {
      const result = streamText({
        model: geminiModel(),
        system: SYSTEM_PROMPT,
        messages: data.messages,
      });
      for await (const delta of result.textStream) {
        await response?.sendChunk(delta);
      }
      return { reply: await result.text };
    } catch (err) {
      logger.error("chatWithAssistant failed", { err });
      throw appError("internal", "assistantUnavailable", "Gemini request failed.");
    }
  },
);
