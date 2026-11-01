type Meta = Record<string, unknown>;

function write(level: "info" | "warn" | "error", message: string, meta?: Meta) {
  const line = JSON.stringify({ severity: level.toUpperCase(), message, ...meta, ...(meta?.err instanceof Error ? { err: meta.err.stack } : {}) });
  (level === "info" ? console.log : level === "warn" ? console.warn : console.error)(line);
}

/** One JSON line per message, which hosting platforms collect as structured logs. */
export const logger = {
  info: (message: string, meta?: Meta) => write("info", message, meta),
  warn: (message: string, meta?: Meta) => write("warn", message, meta),
  error: (message: string, meta?: Meta) => write("error", message, meta),
};
