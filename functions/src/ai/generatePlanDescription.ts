import { generateText } from "ai";
import { logger } from "firebase-functions/v2";
import { DEFAULT_LOCALE, generatePlanDescriptionInput, type GeneratePlanDescriptionResult, type Locale } from "@reservation/shared";
import { secureCall } from "../lib/callable";
import { appError } from "../lib/errors";
import { GOOGLE_GENERATIVE_AI_API_KEY, MONGODB_URI } from "../lib/config";
import { geminiModel } from "./gemini";

const LANGUAGE_NAMES: Record<Locale, string> = { fr: "French", en: "English" };

/** Admin-only: drafts a short marketing description for a credit plan from its name. */
export const generatePlanDescription = secureCall(
  {
    name: "generatePlanDescription",
    schema: generatePlanDescriptionInput,
    role: "admin",
    rateLimit: { limit: 20, windowSec: 60 },
    secrets: [GOOGLE_GENERATIVE_AI_API_KEY, MONGODB_URI],
  },
  async ({ data }): Promise<GeneratePlanDescriptionResult> => {
    try {
      const { text } = await generateText({
        model: geminiModel(),
        prompt: `Generate a short, catchy description (1-2 sentences max) for a workspace-booking credit plan named "${data.name.trim()}". Highlight the value for an employee booking desks and meeting rooms. Write it in ${LANGUAGE_NAMES[data.locale ?? DEFAULT_LOCALE]}. Return only the plain description text, no quotes or markdown.`,
      });
      return { description: text.trim() };
    } catch (err) {
      logger.error("generatePlanDescription failed", { err });
      throw appError("internal", "assistantUnavailable", "Gemini request failed.");
    }
  },
);
