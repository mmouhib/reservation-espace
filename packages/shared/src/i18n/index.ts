import en from "./en.json";
import fr from "./fr.json";

/**
 * Translations live in one JSON file per locale. `fr.json` is the reference:
 * its shape defines the message keys, and every other locale must match it
 * (enforced by the type below and by i18n.test.ts).
 *
 * Message syntax:
 *  - `{name}` is replaced by `values.name`;
 *  - plurals use sibling keys with an Intl.PluralRules suffix (`key_one`, `key_other`)
 *    and are selected from `values.count`;
 *  - `<tag>text</tag>` marks rich text, rendered by the caller (see `parts`).
 */

export const LOCALES = ["fr", "en"] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "fr";

export type Messages = typeof fr;

export const MESSAGES: Record<Locale, Messages> = { fr, en };

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

type PluralSuffix = Intl.LDMLPluralRule;
type StripPlural<K> = K extends `${infer Base}_${PluralSuffix}` ? Base : K;

/** Every translatable key, e.g. "nav.home" or "admin.users.syncDone" (plural forms collapsed). */
export type MessageKey = StripPlural<Leaves<Messages>>;

export type MessageValues = Record<string, string | number>;

export type RichPart = { tag: string | null; text: string };

export interface Translator {
  locale: Locale;
  t(key: MessageKey, values?: MessageValues): string;
  /** The message split into plain text (`tag: null`) and `<tag>…</tag>` parts, each interpolated. */
  parts(key: MessageKey, values?: MessageValues): RichPart[];
}

function lookup(messages: Messages, path: string): string | undefined {
  let node: unknown = messages;
  for (const segment of path.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return typeof node === "string" ? node : undefined;
}

/** True when `key` names a message (useful for keys read back from storage). */
export function isMessageKey(key: string): key is MessageKey {
  return lookup(MESSAGES[DEFAULT_LOCALE], key) !== undefined || lookup(MESSAGES[DEFAULT_LOCALE], `${key}_other`) !== undefined;
}

export function interpolate(template: string, values?: MessageValues): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match));
}

const TAG = /<(\w+)>(.*?)<\/\1>/g;

export function splitRich(template: string): RichPart[] {
  const parts: RichPart[] = [];
  let last = 0;
  for (const m of template.matchAll(TAG)) {
    if (m.index > last) parts.push({ tag: null, text: template.slice(last, m.index) });
    parts.push({ tag: m[1]!, text: m[2]! });
    last = m.index + m[0].length;
  }
  if (last < template.length) parts.push({ tag: null, text: template.slice(last) });
  return parts;
}

export function createTranslator(locale: Locale): Translator {
  const plural = new Intl.PluralRules(locale);

  function template(key: MessageKey, values?: MessageValues): string {
    const count = values?.count;
    for (const messages of [MESSAGES[locale], MESSAGES[DEFAULT_LOCALE]]) {
      if (typeof count === "number") {
        const form = lookup(messages, `${key}_${plural.select(count)}`) ?? lookup(messages, `${key}_other`);
        if (form !== undefined) return form;
      }
      const message = lookup(messages, key);
      if (message !== undefined) return message;
    }
    return key;
  }

  return {
    locale,
    t: (key, values) => interpolate(template(key, values), values),
    // Split before interpolating so that values can never inject tags.
    parts: (key, values) => splitRich(template(key, values)).map((p) => ({ ...p, text: interpolate(p.text, values) })),
  };
}
