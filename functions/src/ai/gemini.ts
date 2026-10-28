import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { GOOGLE_GENERATIVE_AI_API_KEY } from "../lib/config";

// A lite model on purpose: gemini-3.8-flash thinks before answering and took 20-90s per reply
// (past the callable's 60s timeout); the lite model answers in under a second.
// gemini-2.5-flash was retired for new API keys.
const MODEL_ID = "gemini-3.5-flash-lite";

/** A fresh provider per call: the secret's value is only readable once the function instance starts. */
export function geminiModel() {
  const google = createGoogleGenerativeAI({ apiKey: GOOGLE_GENERATIVE_AI_API_KEY.value() });
  return google(MODEL_ID);
}
