import { describe, expect, it } from "vitest";
import { ERROR_REASONS } from "../errors";
import { createTranslator, DEFAULT_LOCALE, isMessageKey, LOCALES, MESSAGES, type MessageKey } from "./index";

function flatten(node: unknown, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (typeof v === "string") out[prefix + k] = v;
    else Object.assign(out, flatten(v, `${prefix}${k}.`));
  }
  return out;
}

const tokens = (message: string) => ({
  placeholders: [...message.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort(),
  tags: [...message.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort(),
});

const reference = flatten(MESSAGES[DEFAULT_LOCALE]);

describe("translation files", () => {
  for (const locale of LOCALES.filter((l) => l !== DEFAULT_LOCALE)) {
    const messages = flatten(MESSAGES[locale]);

    it(`${locale}.json has exactly the keys of ${DEFAULT_LOCALE}.json`, () => {
      expect(Object.keys(messages).sort()).toEqual(Object.keys(reference).sort());
    });

    it(`${locale}.json uses the same placeholders and tags`, () => {
      for (const [key, message] of Object.entries(reference)) {
        expect(tokens(messages[key] ?? ""), key).toEqual(tokens(message));
      }
    });
  }

  it("has no empty messages", () => {
    for (const locale of LOCALES) {
      for (const [key, message] of Object.entries(flatten(MESSAGES[locale]))) {
        expect(message.trim(), `${locale}: ${key}`).not.toBe("");
      }
    }
  });

  it("translates every server error reason", () => {
    for (const reason of ERROR_REASONS) expect(isMessageKey(`errors.${reason}`), reason).toBe(true);
  });
});

describe("createTranslator", () => {
  const fr = createTranslator("fr");
  const en = createTranslator("en");

  it("looks up nested keys and interpolates values", () => {
    expect(en.t("nav.home")).toBe("Home");
    expect(fr.t("home.greetingName", { name: "Léa" })).toBe("Bonjour Léa");
  });

  it("selects plural forms with the locale's rules", () => {
    // French treats 0 as singular, English as plural.
    expect(fr.t("admin.users.syncDone", { count: 0 })).toContain("0 compte désactivé");
    expect(en.t("admin.users.syncDone", { count: 0 })).toContain("0 accounts disabled");
    expect(en.t("admin.users.syncDone", { count: 1 })).toContain("1 account disabled");
  });

  it("splits rich text without letting values inject tags", () => {
    expect(fr.parts("common.comingSoon", { phase: 2 })).toEqual([
      { tag: null, text: "Cette fonctionnalité arrive bientôt " },
      { tag: "muted", text: "(phase 2)" },
      { tag: null, text: "." },
    ]);
    const parts = en.parts("home.greetingName", { name: "<strong>x</strong>" });
    expect(parts).toEqual([{ tag: null, text: "Hello <strong>x</strong>" }]);
  });

  it("falls back to the key for unknown messages", () => {
    expect(en.t("does.not.exist" as MessageKey)).toBe("does.not.exist");
    expect(isMessageKey("does.not.exist")).toBe(false);
    expect(isMessageKey("admin.users.syncDone")).toBe(true);
  });
});
